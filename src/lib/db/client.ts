import { MongoClient, type Db } from "mongodb";

type MongoCache = {
  client: MongoClient | null;
  promise: Promise<MongoClient> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __dongbotMongo: MongoCache | undefined;
}

const uri = process.env.MONGODB_URI || "";

function getCache(): MongoCache {
  if (!global.__dongbotMongo) {
    global.__dongbotMongo = { client: null, promise: null };
  }
  return global.__dongbotMongo;
}

export function isMongoConfigured(): boolean {
  return Boolean(uri);
}

export async function getMongoClient(): Promise<MongoClient> {
  if (!uri) {
    throw new Error("MONGODB_URI is not configured");
  }

  const cache = getCache();
  if (cache.client) return cache.client;

  if (!cache.promise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
    });
    cache.promise = client.connect().then((connected) => {
      cache.client = connected;
      return connected;
    });
  }

  return cache.promise;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  const name = process.env.MONGODB_DB || "dongbot";
  return client.db(name);
}

export async function pingMongo(): Promise<boolean> {
  if (!uri) return false;
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}
