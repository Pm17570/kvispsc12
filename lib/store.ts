'use client';
import { AppData, User, Club, ClubRound, TreasureAnswer, Activity, ClubRegistration } from './types';
import { SEED_DATA } from './seedData';

const STORE_KEY = 'clubhub_data';

export function getStore(): AppData {
  if (typeof window === 'undefined') return SEED_DATA;
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) {
    localStorage.setItem(STORE_KEY, JSON.stringify(SEED_DATA));
    return SEED_DATA;
  }
  return JSON.parse(raw) as AppData;
}

export function saveStore(data: AppData): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

export function resetStore(): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(SEED_DATA));
}

// Auth
export function loginUser(email: string, password: string): User | null {
  const store = getStore();
  return store.users.find(u => u.email === email && u.password === password) ?? null;
}

export function getUserById(id: string): User | null {
  const store = getStore();
  return store.users.find(u => u.id === id) ?? null;
}

// Users
export function getAllUsers(): User[] {
  return getStore().users;
}

export function updateUser(updated: User): void {
  const store = getStore();
  store.users = store.users.map(u => u.id === updated.id ? updated : u);
  saveStore(store);
}

export function addUser(user: User): void {
  const store = getStore();
  store.users.push(user);
  saveStore(store);
}

export function deleteUser(id: string): void {
  const store = getStore();
  store.users = store.users.filter(u => u.id !== id);
  saveStore(store);
}

// Clubs
export function getClubs(): Club[] {
  return getStore().clubs;
}

export function getClubById(id: string): Club | null {
  return getStore().clubs.find(c => c.id === id) ?? null;
}

export function addClub(club: Club): void {
  const store = getStore();
  store.clubs.push(club);
  saveStore(store);
}

export function updateClub(updated: Club): void {
  const store = getStore();
  store.clubs = store.clubs.map(c => c.id === updated.id ? updated : c);
  saveStore(store);
}

export function deleteClub(id: string): void {
  const store = getStore();
  store.clubs = store.clubs.filter(c => c.id !== id);
  saveStore(store);
}

// Club registration
export function registerClub(userId: string, clubId: string, round: number): { success: boolean; message: string } {
  const store = getStore();
  const club = store.clubs.find(c => c.id === clubId);
  if (!club) return { success: false, message: 'Club not found' };

  const currentCount = club.members.filter(m => m.round === round).length;
  if (currentCount >= club.capacity) return { success: false, message: 'Club is full' };

  const user = store.users.find(u => u.id === userId);
  if (!user) return { success: false, message: 'User not found' };

  // Remove previous registration in this round
  const prevClubId = user.selectedClubs[round];
  if (prevClubId) {
    const prevClub = store.clubs.find(c => c.id === prevClubId);
    if (prevClub) {
      prevClub.members = prevClub.members.filter(m => !(m.userId === userId && m.round === round));
    }
  }

  const regEntry: ClubRegistration = {
    userId,
    clubId,
    round,
    registeredAt: new Date().toISOString(),
  };

  // Update club members
  club.members = club.members.filter(m => !(m.userId === userId && m.round === round));
  club.members.push({ userId, registeredAt: regEntry.registeredAt, round });

  // Update user
  user.selectedClubs[round] = clubId;
  user.clubHistory = user.clubHistory.filter(h => !(h.userId === userId && h.round === round));
  user.clubHistory.push(regEntry);

  saveStore(store);
  return { success: true, message: 'Registered successfully' };
}

// Club rounds
export function getClubRounds(): ClubRound[] {
  return getStore().clubRounds;
}

export function getCurrentRound(): ClubRound | null {
  const now = new Date();
  const rounds = getStore().clubRounds;
  return rounds.find(r => new Date(r.openAt) <= now && now <= new Date(r.closeAt)) ?? null;
}

export function updateClubRound(round: ClubRound): void {
  const store = getStore();
  store.clubRounds = store.clubRounds.map(r => r.round === round.round ? round : r);
  saveStore(store);
}

// Treasure hunt
export function getTreasureAnswers(): TreasureAnswer[] {
  return getStore().treasureAnswers;
}

export function updateTreasureAnswers(answers: TreasureAnswer[]): void {
  const store = getStore();
  // Re-evaluate all users' locked answers
  store.users = store.users.map(user => {
    const newLocked: { [slot: number]: string } = {};
    Object.entries(user.treasureAnswers).forEach(([slotStr, val]) => {
      const slot = parseInt(slotStr);
      const correct = answers.find(a => a.slot === slot);
      if (correct && val.toLowerCase().trim() === correct.answer.toLowerCase().trim()) {
        newLocked[slot] = val;
      }
    });
    return { ...user, treasureAnswers: newLocked };
  });
  store.treasureAnswers = answers;
  saveStore(store);
}

export function checkTreasureAnswers(
  userId: string,
  inputs: { [slot: number]: string }
): { correct: number[]; wrong: number[] } {
  const store = getStore();
  const answers = store.treasureAnswers;
  const user = store.users.find(u => u.id === userId);
  if (!user) return { correct: [], wrong: [] };

  const correct: number[] = [];
  const wrong: number[] = [];

  Object.entries(inputs).forEach(([slotStr, val]) => {
    if (!val.trim()) return;
    const slot = parseInt(slotStr);
    if (user.treasureAnswers[slot]) return; // already locked
    const ans = answers.find(a => a.slot === slot);
    if (ans && val.toLowerCase().trim() === ans.answer.toLowerCase().trim()) {
      correct.push(slot);
      user.treasureAnswers[slot] = val;
    } else {
      wrong.push(slot);
    }
  });

  // Set cooldown
  store.treasureCooldowns[userId] = new Date().toISOString();
  store.users = store.users.map(u => u.id === userId ? user : u);
  saveStore(store);

  return { correct, wrong };
}

export function getTreasureCooldown(userId: string): Date | null {
  const store = getStore();
  const ts = store.treasureCooldowns[userId];
  if (!ts) return null;
  const cooldownEnd = new Date(new Date(ts).getTime() + 20 * 60 * 1000);
  if (cooldownEnd > new Date()) return cooldownEnd;
  return null;
}

// Activities
export function getActivities(): Activity[] {
  return getStore().activities.sort((a, b) => a.date.localeCompare(b.date));
}

export function addActivity(activity: Activity): void {
  const store = getStore();
  store.activities.push(activity);
  saveStore(store);
}

export function updateActivity(updated: Activity): void {
  const store = getStore();
  store.activities = store.activities.map(a => a.id === updated.id ? updated : a);
  saveStore(store);
}

export function deleteActivity(id: string): void {
  const store = getStore();
  store.activities = store.activities.filter(a => a.id !== id);
  saveStore(store);
}
