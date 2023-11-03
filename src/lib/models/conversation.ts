///////////////////////////////////////////////////////////////////////////////
//
// ConversationTurn
//
///////////////////////////////////////////////////////////////////////////////
export enum Speaker {
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
  USER = 'user',
}

export interface ConversationTurnBase {
  // Don't require speaker: Speaker. May want to allow other
  // speakers at some point.
  role: string;
  content: string;
}

export interface ConversationTurnUser extends ConversationTurnBase {
  role: Speaker.USER;
  content: string;
}

export interface ConversationTurnAssistant extends ConversationTurnBase {
  role: Speaker.ASSISTANT;
  content: string;
}

export interface ConversationTurnSystem extends ConversationTurnBase {
  role: Speaker.SYSTEM;
  content: string;
}

export type ConversationTurn =
  | ConversationTurnAssistant
  | ConversationTurnSystem
  | ConversationTurnUser;

export type Conversation = ConversationTurn[];
