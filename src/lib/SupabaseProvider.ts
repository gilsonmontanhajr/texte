
import * as Y from "yjs";
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from "y-protocols/awareness";
import { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";

export default class SupabaseProvider {
    public awareness: Awareness;
    private channel: RealtimeChannel;
    private doc: Y.Doc;
    private supabase: SupabaseClient;
    private channelId: string;
    private status: "connected" | "disconnected" | "connecting" = "disconnected";
    public shouldBroadcast: boolean = true;

    constructor(doc: Y.Doc, supabase: SupabaseClient, config: { channel: string; id: string }) {
        this.doc = doc;
        this.supabase = supabase;
        this.channelId = config.channel;
        this.awareness = new Awareness(doc);

        this.channel = supabase.channel(this.channelId);

        this.setupPresence();
        this.setupDocumentSync();

        this.channel.subscribe((status) => {
            if (status === "SUBSCRIBED") {
                this.status = "connected";
                // Sync initial state if needed (e.g. from DB) - handled by Editor component for now

                // Broadcast our awareness state immediately so others see us
                if (this.awareness.getLocalState() !== null) {
                    const update = encodeAwarenessUpdate(this.awareness, [this.awareness.clientID]);
                    this.channel.send({
                        type: "broadcast",
                        event: "awareness",
                        payload: Array.from(update),
                    });
                }
            }
        });
    }

    private setupDocumentSync() {
        this.doc.on("update", (update: Uint8Array, origin: any) => {
            if (origin !== this && this.status === "connected" && this.shouldBroadcast) {
                this.channel.send({
                    type: "broadcast",
                    event: "update",
                    payload: Array.from(update),
                });
            }
        });

        this.channel.on("broadcast", { event: "update" }, ({ payload }: { payload: number[] }) => {
            Y.applyUpdate(this.doc, new Uint8Array(payload), this);
        });
    }

    private setupPresence() {
        // Broadcast awareness updates
        this.awareness.on("update", ({ added, updated, removed }: any) => {
            const changedClients = added.concat(updated).concat(removed);
            const update = encodeAwarenessUpdate(this.awareness, changedClients);
            if (this.status === "connected") {
                this.channel.send({
                    type: "broadcast",
                    event: "awareness",
                    payload: Array.from(update),
                });
            }
        });

        this.channel.on("broadcast", { event: "awareness" }, ({ payload }: { payload: number[] }) => {
            applyAwarenessUpdate(this.awareness, new Uint8Array(payload), this);
        });
    }

    public destroy() {
        this.channel.unsubscribe();
        this.awareness.destroy();
    }
}
