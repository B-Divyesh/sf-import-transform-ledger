import type { DataSet, FieldMapping, Recipe } from "./core";

export interface WorkspaceRecord {
  source: DataSet | null;
  targetHeaders: string[];
  mappings: FieldMapping[];
  dedupeKeys: string[];
  recipeName: string;
  savedAt: string;
}

const DB_NAME = "import-transform-ledger";
const VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
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

async function store(mode: IDBTransactionMode, name: string): Promise<IDBObjectStore> {
  const db = await openDatabase();
  return db.transaction(name, mode).objectStore(name);
}

export async function saveWorkspace(value: WorkspaceRecord): Promise<void> {
  const objectStore = await store("readwrite", "workspace");
  await requestPromise(objectStore.put(value, "active"));
}

export async function loadWorkspace(): Promise<WorkspaceRecord | null> {
  const objectStore = await store("readonly", "workspace");
  return (await requestPromise(objectStore.get("active")) as WorkspaceRecord | undefined) ?? null;
}

export async function clearWorkspace(): Promise<void> {
  const objectStore = await store("readwrite", "workspace");
  await requestPromise(objectStore.delete("active"));
}

export async function saveRecipe(recipe: Recipe): Promise<void> {
  const objectStore = await store("readwrite", "recipes");
  await requestPromise(objectStore.put(recipe));
}

export async function listRecipes(): Promise<Recipe[]> {
  const objectStore = await store("readonly", "recipes");
  return (await requestPromise(objectStore.getAll()) as Recipe[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteRecipe(name: string): Promise<void> {
  const objectStore = await store("readwrite", "recipes");
  await requestPromise(objectStore.delete(name));
}

export async function saveRun(report: Record<string, unknown>): Promise<void> {
  const objectStore = await store("readwrite", "runs");
  await requestPromise(objectStore.put(report));
}

function requestPromise(request: IDBRequest): Promise<unknown> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
