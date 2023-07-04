import { EventMap, Glue } from "@wallet-test-framework/glue";
import { AddressInfo } from "node:net";
import { Server as WebSocketServer } from "rpc-websockets";

type Actions = { [k in keyof Omit<Glue, "on" | "next">]: null };
type Events = { [k in keyof EventMap]: null };

const ACTIONS: (keyof Actions)[] = (() => {
    const helper: Actions = {
        addEthereumChain: null,
        activateChain: null,
        switchEthereumChain: null,
        requestAccounts: null,
        signMessage: null,
    } as const;

    const actions: (keyof Actions)[] = [];

    let key: keyof Actions;
    for (key in helper) {
        actions.push(key);
    }

    return actions;
})();

const EVENTS: (keyof Events)[] = (() => {
    const helper: Events = {
        requestaccounts: null,
        addethereumchain: null,
        switchethereumchain: null,
        signmessage: null,
    } as const;

    const events: (keyof Events)[] = [];

    let key: keyof Events;
    for (key in helper) {
        events.push(key);
    }

    return events;
})();

export interface ServeOptions {
    port: number;
}

export interface ServeResult {
    address: string | AddressInfo;
    close(): Promise<void>;
}

export default function serveGlue(
    glue: Glue,
    options: ServeOptions
): ServeResult {
    const wss = new WebSocketServer({ port: options.port });

    for (const key of EVENTS) {
        wss.event(key);
        glue.on(key, (evt: unknown) => wss.emit(key, evt));
    }

    for (const glueKey of ACTIONS) {
        // https://github.com/elpheria/rpc-websockets/issues/139
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        wss.register(glueKey, async (params) => {
            // TODO: Validate that the message matches the interfaces.
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            const result: unknown = await glue[glueKey](params[0]);
            if (result === undefined) {
                return null;
            }
            return result;
        }).public();
    }

    return {
        address: wss.wss.address(),
        close: () => wss.close(),
    };
}
