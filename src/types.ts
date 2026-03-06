// Type definitions for @pi/api
export interface Extension {
  name: string;
  commands?: Command[];
  tools?: Tool[];
}

export interface Command {
  name: string;
  description: string;
  handler: (args: string[], context: any, view: View) => Promise<void>;
}

export interface Tool {
  name: string;
  description: string;
  schema: ToolSchema;
  handler: (params: any) => Promise<any>;
}

export interface ToolSchema {
  type: string;
  properties: Record<string, any>;
  required: string[];
}

export interface View {
  addMessage: (message: Message) => void;
}

export interface Message {
  role: string;
  text: string;
}
