// 内存验证码存储（带 TTL）

const codes = new Map();

const CODE_TTL = 5 * 60 * 1000;      // 验证码有效期 5 分钟
const RESEND_COOLDOWN = 60 * 1000;    // 重发冷却 60 秒

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function saveCode(phone, code) {
  codes.set(phone, { code, createdAt: Date.now() });
}

function verify(phone, code) {
  const record = codes.get(phone);
  if (!record) return false;
  if (Date.now() - record.createdAt > CODE_TTL) {
    codes.delete(phone);
    return false;
  }
  return String(record.code) === String(code);
}

function canResend(phone) {
  const record = codes.get(phone);
  if (!record) return true;
  return Date.now() - record.createdAt > RESEND_COOLDOWN;
}

function consume(phone) {
  codes.delete(phone);
}

module.exports = { generateCode, saveCode, verify, canResend, consume };
