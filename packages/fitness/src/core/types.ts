export interface InputPort<T> {
  read(argv?: string[]): Promise<T>;
}

export interface OutputPort<T> {
  write(result: T): void | Promise<void>;
}

export interface Runner<TIn, TOut> {
  use(input: InputPort<TIn>, output: OutputPort<TOut>): Promise<void>;
}
