import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface HighScore {
    bestTime: bigint;
    bestNight: bigint;
}
export interface backendInterface {
    getHighScore(): Promise<HighScore>;
    getNightmareScore(): Promise<HighScore>;
    resetHighScore(): Promise<void>;
    resetNightmareScore(): Promise<void>;
    saveHighScore(bestNight: bigint, bestTime: bigint): Promise<void>;
    saveNightmareScore(bestNight: bigint, bestTime: bigint): Promise<void>;
}
