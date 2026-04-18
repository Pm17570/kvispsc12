export type Role = 'student' | 'admin';

export interface User {
  id: string;
  firstname: string;
  surname: string;
  nickname: string;
  email: string;
  role: Role;
  profilePicture: string;
  bio: string;
  password: string;
  selectedClubs: { [round: number]: string | null }; // round -> clubId
  clubHistory: ClubRegistration[];
  treasureAnswers: { [slot: number]: string }; // slot -> answer text (locked correct answers)
}

export interface Club {
  id: string;
  name: string;
  description: string;
  type: string;
  capacity: number;
  members: { userId: string; registeredAt: string; round: number }[];
  imageUrl?: string;
}

export interface ClubRound {
  round: number; // 1-4
  openAt: string; // ISO
  closeAt: string; // ISO
}

export interface ClubRegistration {
  userId: string;
  clubId: string;
  round: number;
  registeredAt: string;
}

export interface TreasureAnswer {
  slot: number; // 0-11
  answer: string;
}

export interface Activity {
  id: string;
  date: string;
  time: string;
  title: string;
  location: string;
  description: string;
  type: string;
}

export interface AppData {
  users: User[];
  clubs: Club[];
  clubRounds: ClubRound[];
  treasureAnswers: TreasureAnswer[];
  activities: Activity[];
  treasureCooldowns: { [userId: string]: string }; // userId -> ISO timestamp of last check
}
