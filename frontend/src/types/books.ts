/**
 * 가계부 관련 타입 정의
 * 백엔드 models/books.py와 동기화
 */

export enum BookRole {
  OWNER = 'owner',
  EDITOR = 'editor',
}

export interface Book {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface BookListItem extends Book {
  current_role: BookRole;
}

export interface BookCreate {
  name: string;
}

export interface BookUpdate {
  name: string;
}

export interface BookMember {
  book_id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: BookRole;
  joined_at: string;
}

export interface BookMemberInvite {
  email: string;
  role: BookRole;
}

export interface BookMemberUpdate {
  role: BookRole;
}
