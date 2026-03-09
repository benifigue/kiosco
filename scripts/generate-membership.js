const crypto = require('crypto');

// En un entorno real, esto debería estar en tu .env secreto del servidor central
const SECRET = process.env.MEMBERSHIP_SECRET || 'clave-secreta-para-kiosco-manager-2024';

function generateKey(storeName, type, days) {
  const expires = new Date();
  expires.setDate(expires.getDate() + parseInt(days));
  
  const payload = {
    s: storeName,
    t: type,
    e: expires.getTime()
  };
  
  const payloadStr = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', SECRET).update(payloadStr).digest('hex').substring(0, 16);
  
  const token = Buffer.from(payloadStr).toString('base64') + '.' + signature;
  return {
    token,
    expires: expires.toISOString(),
    type
  };
}

// CLI simple
const args = process.argv.slice(2);
if (args.length < 3) {
  console.log('Uso: node generate-membership.js "Nombre del Negocio" [PRO|PREMIUM] [días]');
  console.log('Ejemplo: node generate-membership.js "Kiosco El Trébol" PRO 30');
  process.exit(1);
}

const [name, type, days] = args;
const result = generateKey(name, type, days);

console.log('\n--- NUEVA MEMBRESÍA GENERADA ---');
console.log('Negocio:', name);
console.log('Tipo:', result.type);
console.log('Expira:', result.expires);
console.log('-------------------------------');
console.log('CLAVE DE ACTIVACIÓN:');
console.log(result.token);
console.log('-------------------------------\n');
