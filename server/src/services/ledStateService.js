import { prisma } from '../lib/prisma.js';
import { emitLedUpdate } from './realtimeService.js';

export async function getLedState() {
  const state = await prisma.appSetting.findUnique({ where: { key: 'led_state' } });
  return state?.value || null;
}

export async function setLedState(payload) {
  const updated = await prisma.appSetting.upsert({
    where: { key: 'led_state' },
    update: { value: payload },
    create: { key: 'led_state', value: payload },
  });
  emitLedUpdate(updated.value);
  return updated.value;
}
