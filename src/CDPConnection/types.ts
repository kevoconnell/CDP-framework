export interface ICDPConnection {
  send(method: string, params?: any): Promise<any>;
  on(event: string, handler: Function): void;
  connect(): Promise<void>;
}
