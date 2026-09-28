import { MongoClient, Db } from "mongodb";
import { fsConfig } from "@/lib/config";

declare global {
  // eslint-disable-next-line no-var
  var __mongoClient: MongoClient | undefined;
  // eslint-disable-next-line no-var
  var __mongoDb: Db | undefined;
}

export function isMongoConfigured() {
  return Boolean(fsConfig.mongodbUri?.trim());
}

export async function getMongoDb(): Promise<Db | null> {
  if (!isMongoConfigured()) return null;

  if (global.__mongoDb) return global.__mongoDb;

  const client =
    global.__mongoClient ??
    new MongoClient(fsConfig.mongodbUri, { maxPoolSize: 10 });

  if (!global.__mongoClient) {
    await client.connect();
    global.__mongoClient = client;
  }

  const dbName = process.env.MONGODB_DB_NAME ?? "freeswitchapp";
  global.__mongoDb = client.db(dbName);
  return global.__mongoDb;
}
