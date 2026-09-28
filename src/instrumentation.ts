export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getEslManager } = await import("@/lib/esl/manager");
    void getEslManager().start();
  }
}
