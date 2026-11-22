export type OperationAction = 'email' | 'commerce' | 'planner' | 'channels';
export type OperationCheck = {
  id: string;
  label: string;
  state: 'confirmed' | 'attention' | 'waiting';
  detail: string;
  at?: string;
  action: OperationAction;
};
