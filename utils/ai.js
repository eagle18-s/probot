const https = require('https');
const fs = require('fs');
const path = require('path');

const GEMINI_KEY = process.env.GEMINI_API_KEY;
// Google-un pulsuz təbəqəsi üçün sabit mövcud olan Flash modelindən istifadə edirik
const MODEL = process.env.AI_MODEL || 'gemini-2.5-flash';

// ============ KOD OXUYUCU (dəyişməyib) ============
function readBotFile(relPath) {
  try {
    const root = path.join(__dirname, '..');
    const full = path.join(root, relPath);
    if (!full.startsWith(root)) return '❌ Yol xətası (root xaricində).';
    if (!fs.existsSync(full)) return `❌ Fayl tapılmadı: ${relPath}`;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      return '📁 Qovluq: ' + fs.readdirSync(full).join(', ');
    }
    if (stat.size > 50000) return '❌ Fayl çox böyükdür (50KB-dan artıq).';
    return fs.readFileSync(full, 'utf8');
  } catch (e) {
    return `❌ Oxuma xətası: ${e.message}`;
  }
}

function listBotFiles(dir = '.') {
  try {
    const root = path.join(__dirname, '..');
    const full = path.join(root, dir);
    const out = [];
    function walk(p, prefix) {
      const items = fs.readdirSync(p);
      for (const it of items) {
        if (it === 'node_modules' || it === '.git' || it.startsWith('.')) continue;
        const fp = path.join(p, it);
        const st = fs.statSync(fp);
        if (st.isDirectory()) {
          out.push(`${prefix}${it}/`);
          walk(fp, `${prefix}${it}/`);
        } else {
          out.push(`${prefix}${it} (${st.size}B)`);
        }
      }
    }
    walk(full, '');
    return out.join('\n');
  } catch (e) {
    return `❌ Xəta: ${e.message}`;
  }
}

// ============ TOOL CALLING (AI komandaları icra etsin) ============
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Botun öz faylını oxuyur (məsələn, "commands/system.js" və ya "index.js"). AI özü haqqında məlumat almaq üçün istifadə edir.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Fayl yolu (root-dan). Məsələn: "index.js", "commands/moderation.js"' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: 'Botun qovluq strukturunu göstərir. AI botun hansı faylları olduğunu bilmək üçün istifadə edir.',
      parameters: {
        type: 'object',
        properties: {
          dir: { type: 'string', description: 'Qovluq adı (default "."). Məsələn: "commands" və ya "utils"' }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'execute_bot_command',
      description: 'Botun mövcud əmrlərini icra edir. Məsələn: ".ban @user" və ya ".warn @user spam".',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Tam əmr (nöqtə ilə başlayır). Məsələn: ".ban @user sebep"' }
        },
        required: ['command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_guild_info',
      description: 'Serverin məlumatlarını (üzv sayı, kanal sayı, rol sayı və s.) göstərir.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_user_info',
      description: 'Bir istifadəçi haqqında məlumat (adı, ID-si, rolları).',
      parameters: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'İstifadəçi ID-si' }
        },
        required: ['user_id']
      }
    }
  }
];

// ============ GOOGLE AI STUDIO (OpenAI Compatibility) ÇAĞIRIŞI ============
function geminiRequest(messages, tools = null) {
  return new Promise((resolve, reject) => {
    if (!GEMINI_KEY) return reject(new Error('GEMINI_API_KEY yoxdur!'));

    const body = {
      model: MODEL,
      messages: messages
    };
    if (tools && tools.length) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }

    const data = JSON.stringify(body);

    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: '/v1beta/openai/chat/completions', // Google-un OpenAI uyğunluq endpoint-i
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GEMINI_KEY}`, // OpenAI formatında Authorization
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(buf);
          if (json.error) return reject(new Error(json.error.message || 'API xətası'));
          resolve(json);
        } catch (e) {
          reject(new Error('JSON parse xətası: ' + buf.slice(0, 200)));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ============ TOOL EXECUTOR (dəyişməyib) ============
async function executeTool(toolCall, context) {
  const name = toolCall.function.name;
  const args = JSON.parse(toolCall.function.arguments || '{}');

  try {
    switch (name) {
      case 'read_file':
        return readBotFile(args.path);

      case 'list_files':
        return listBotFiles(args.dir || '.');

      case 'get_guild_info': {
        const g = context.guild;
        return JSON.stringify({
          name: g.name,
          memberCount: g.memberCount,
          channelCount: g.channels.cache.size,
          roleCount: g.roles.cache.size,
          ownerId: g.ownerId,
          createdAt: g.createdAt
        }, null, 2);
      }

      case 'get_user_info': {
        try {
          const m = await context.guild.members.fetch(args.user_id);
          return JSON.stringify({
            id: m.id,
            tag: m.user.tag,
            displayName: m.displayName,
            roles: m.roles.cache.map(r => r.name),
            joinedAt: m.joinedAt
          }, null, 2);
        } catch {
          return '❌ İstifadəçi tapılmadı.';
        }
      }

      case 'execute_bot_command': {
        if (!context.member.permissions.has('Administrator')) {
          return '❌ AI vasitəsilə komanda icra etmək üçün Administrator yetkisi lazımdır.';
        }
        const cmd = args.command;
        if (!cmd || !cmd.startsWith('.')) return '❌ Komanda "." ilə başlamalıdır.';
        
        try {
          context.message.content = cmd;
          context.message.channel.send(`🤖 **AI komanda icra edir:** \`${cmd}\``).catch(() => {});
          context.client.emit('messageCreate', context.message);
          return `✅ Komanda göndərildi: ${cmd}`;
        } catch (e) {
          return `❌ İcra xətası: ${e.message}`;
        }
      }

      default:
        return '❌ Bilmirəm belə bir alət.';
    }
  } catch (e) {
    return `❌ Alət xətası: ${e.message}`;
  }
}

// ============ ƏSAS FUNKSİYA (dəyişməyib) ============
async function askAI(userMessage, context, history = []) {
  const systemPrompt = `Sən ASTROL adlı Discord botusan. Azərbaycan dilində cavab ver. 
Sənin haqqında:
- Node.js, discord.js v14 ilə yazılmışsan.
- Moderasiya (ban, kick, mute, warn, jail), ticket, çekiliş, anket, reaction roles, invite tracker, poll və s. funksiyaların var.
- Öz fayllarını oxuya bilərsən (read_file, list_files).
- Əgər istifadəçi səndən "özünü tanıt", "nə edə bilərsən", "kodunu göstər" kimi şeylər soruşsa, read_file/list_files istifadə et.
- Əgər istifadəçi adminsə və bot əmri icra etmək istəsə, execute_bot_command istifadə et.
- Qısa, dəqiq və mehriban cavab ver.

Cari istifadəçi: ${context.member?.user.tag || 'Bilinmir'} (Admin: ${context.member?.permissions?.has('Administrator') ? 'Bəli' : 'Xeyr'})
Server: ${context.guild?.name || 'DM'}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10),
    { role: 'user', content: userMessage }
  ];

  let response = await geminiRequest(messages, TOOLS);
  let choice = response.choices?.[0]?.message;
  if (!choice) throw new Error('AI cavab vermədi.');

  let iterations = 0;
  while (choice.tool_calls && choice.tool_calls.length && iterations < 3) {
    iterations++;
    messages.push(choice);
    for (const tc of choice.tool_calls) {
      const result = await executeTool(tc, context);
      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: String(result).slice(0, 4000)
      });
    }
    response = await geminiRequest(messages, TOOLS);
    choice = response.choices?.[0]?.message;
    if (!choice) throw new Error('AI cavab vermədi (tool loop).');
  }

  return choice.content || '(AI cavab verə bilmədi)';
}

module.exports = { askAI, readBotFile, listBotFiles };
