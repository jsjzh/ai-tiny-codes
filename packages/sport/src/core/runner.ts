import { InputPort, OutputPort, Runner } from "./types";

export function createRunner<TIn, TOut>(compute: (input: TIn) => TOut): Runner<TIn, TOut> {
  return {
    async use(input: InputPort<TIn>, output: OutputPort<TOut>): Promise<void> {
      try {
        const data = await input.read(process.argv.slice(2));
        output.write(compute(data));
      } catch (err: unknown) {
        console.error("");
        console.error("✗ 计算失败：", err instanceof Error ? err.message : err);
        process.exit(1);
      }
    },
  };
}
