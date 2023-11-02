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
  speaker: string;
  content: string;
}

export interface ConversationTurnUser extends ConversationTurnBase {
  speaker: Speaker.USER;
  content: string;
}

export interface ConversationTurnAssistant extends ConversationTurnBase {
  speaker: Speaker.ASSISTANT;
  content: string;
}

export interface ConversationTurnSystem extends ConversationTurnBase {
  speaker: Speaker.SYSTEM;
  content: string;
}

export type ConversationTurn =
  | ConversationTurnAssistant
  | ConversationTurnSystem
  | ConversationTurnUser;

export type Conversation = ConversationTurn[];
