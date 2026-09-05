import type { DataSet, FieldMapping, Recipe } from "./core";

export interface WorkspaceRecord {
  source: DataSet | null;
  targetHeaders: string[];
  mappings: FieldMapping[];
  dedupeKeys: string[];
  recipeName: string;
  recipeCreatedAt?: string;
  savedAt: string;
}

const DB_NAME = "import-transform-ledger";
const VERSION = 1;

export type StorageScope = "real" | "demo";

function databaseName(scope: StorageScope): string {
  return scope === "demo" ? `${DB_NAME}:demo` : DB_NAME;
}

function openDatabase(scope: StorageScope): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName(scope), VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("workspace")) db.createObjectStore("workspace");
      if (!db.objectStoreNames.contains("recipes")) db.createObjectStore("recipes", { keyPath: "name" });
      if (!db.objectStoreNames.contains("runs")) db.createObjectStore("runs", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function store(scope: StorageScope, mode: IDBTransactionMode, name: string): Promise<IDBObjectStore> {
  const db = await openDatabase(scope);
  return db.transaction(name, mode).objectStore(name);
}

export async function saveWorkspace(value: WorkspaceRecord, scope: StorageScope = "real"): Promise<void> {
  const objectStore = await store(scope, "readwrite", "workspace");
  await requestPromise(objectStore.put(value, "active"));
}

export async function loadWorkspace(scope: StorageScope = "real"): Promise<WorkspaceRecord | null> {
  const objectStore = await store(scope, "readonly", "workspace");
  return (await requestPromise(objectStore.get("active")) as WorkspaceRecord | undefined) ?? null;
}

export async function clearWorkspace(scope: StorageScope = "real"): Promise<void> {
  const objectStore = await store(scope, "readwrite", "workspace");
  await requestPromise(objectStore.delete("active"));
}

export async function saveRecipe(recipe: Recipe, scope: StorageScope = "real"): Promise<void> {
  const objectStore = await store(scope, "readwrite", "recipes");
  await requestPromise(objectStore.put(recipe));
}

export async function listRecipes(scope: StorageScope = "real"): Promise<Recipe[]> {
  const objectStore = await store(scope, "readonly", "recipes");
  return (await requestPromise(objectStore.getAll()) as Recipe[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteRecipe(name: string, scope: StorageScope = "real"): Promise<void> {
  const objectStore = await store(scope, "readwrite", "recipes");
  await requestPromise(objectStore.delete(name));
}

export async function saveRun(report: Record<string, unknown>, scope: StorageScope = "real"): Promise<void> {
  const objectStore = await store(scope, "readwrite", "runs");
  await requestPromise(objectStore.put(report));
}

export async function clearAllData(scope: StorageScope): Promise<void> {
  const db = await openDatabase(scope);
  const transaction = db.transaction(["workspace", "recipes", "runs"], "readwrite");
  for (const name of ["workspace", "recipes", "runs"]) transaction.objectStore(name).clear();
  await transactionPromise(transaction);
  db.close();
}

function requestPromise(request: IDBRequest): Promise<unknown> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
