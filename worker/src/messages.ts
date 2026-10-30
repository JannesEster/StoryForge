export { buildMessages, maxTokensFor } from "../../site/js/messages.js";

export interface StoryChoice {
  type: "option" | "free";
  index?: number;
  text?: string;
  /** True when free text failed the age check and was replaced before prompting. */
  blocked?: boolean;
}

export interface HistoryBeat {
  text: string;
  options: [string, string, string];
  choice: StoryChoice;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
