import serveGlue, { ServeResult } from "../src/index";
import * as glue from "@wallet-test-framework/glue";
import { describe, it } from "mocha";
import * as assert from "node:assert/strict";
import { Client } from "rpc-websockets";

class MockGlue extends glue.Glue {
    activateChain(_action: glue.ActivateChain): Promise<void> {
        assert.fail("`activateChain` called unexpectedly");
    }

    requestAccounts(_action: glue.RequestAccounts): Promise<void> {
        assert.fail("`requestAccounts` called unexpectedly");
    }

    switchEthereumChain(_action: glue.SwitchEthereumChain): Promise<void> {
        assert.fail("`switchEthereumChain` called unexpectedly");
    }

    addEthereumChain(_action: glue.AddEthereumChain): Promise<void> {
        assert.fail("`addEthereumChain` called unexpectedly");
    }

    public emit<E extends keyof glue.EventMap>(
        type: E,
        ...ev: Parameters<glue.EventMap[E]>
    ): void {
        super.emit(type, ...ev);
    }
}

describe("serveGlue()", function () {
    let mockGlue: MockGlue;
    let serve: ServeResult;
    let client: Client;

    this.timeout(10000);

    beforeEach(function (done) {
        mockGlue = new MockGlue();
        serve = serveGlue(mockGlue, { port: 0 });

        if (typeof serve.address === "string") {
            client = new Client(serve.address);
        } else {
            // TODO: localhost might not resolve properly on IPv6?
            client = new Client(`ws://localhost:${serve.address.port}`);
        }

        client.once("open", done);
    });

    this.afterEach(async function () {
        client.close();
        await serve.close();
    });

    it("calls activateChain", async function () {
        let activated: null | glue.ActivateChain = null;

        // eslint-disable-next-line @typescript-eslint/require-await
        mockGlue.activateChain = async (action) => void (activated = action);

        const param: glue.ActivateChain = {
            chainId: "1",
            rpcUrl: "banana",
        };

        await client.call("activateChain", [param]);

        assert.deepEqual(
            activated,
            param,
            "activateChain was called with correct parameters"
        );
    });

    it("calls requestAccounts", async function () {
        let requested: null | glue.RequestAccounts = null;

        // eslint-disable-next-line @typescript-eslint/require-await
        mockGlue.requestAccounts = async (action) => void (requested = action);

        const param: glue.RequestAccounts = {
            id: "3",
            action: "approve",
            accounts: ["0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
        };

        await client.call("requestAccounts", [param]);

        assert.deepEqual(
            requested,
            param,
            "requestAccounts was called with correct parameters"
        );
    });

    it("calls switchEthereumChain", async function () {
        let chain: null | glue.SwitchEthereumChain = null;

        // eslint-disable-next-line @typescript-eslint/require-await
        mockGlue.switchEthereumChain = async (action) => void (chain = action);

        const param: glue.SwitchEthereumChain = {
            id: "3",
            action: "approve",
        };

        await client.call("switchEthereumChain", [param]);

        assert.deepEqual(
            chain,
            param,
            "switchEthereumChain was called with correct parameters"
        );
    });

    it("calls addEthereumChain", async function () {
        let chain: null | glue.AddEthereumChain = null;

        // eslint-disable-next-line @typescript-eslint/require-await
        mockGlue.addEthereumChain = async (action) => void (chain = action);

        const param: glue.AddEthereumChain = {
            id: "3",
            action: "approve",
        };

        await client.call("addEthereumChain", [param]);

        assert.deepEqual(
            chain,
            param,
            "addEthereumChain was called with correct parameters"
        );
    });

    it("receives requestaccounts events", async function () {
        await client.subscribe("requestaccounts");

        const promise = new Promise((res) =>
            client.once("requestaccounts", res)
        );

        const event = new glue.RequestAccountsEvent("3", {
            accounts: ["0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
        });

        mockGlue.emit("requestaccounts", event);

        const actual = await promise;

        assert.deepEqual(actual, {
            id: "3",
            type: "requestaccounts",
            accounts: ["0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
        });
    });

    it("receives addethereumchain events", async function () {
        await client.subscribe("addethereumchain");

        const promise = new Promise((res) =>
            client.once("addethereumchain", res)
        );

        const event = new glue.AddEthereumChainEvent("3", {
            chainId: "1",
            blockExplorerUrls: ["explore:1"],
            chainName: "myChain",
            iconUrls: ["icon:1", "icon:2"],
            rpcUrls: ["rpc:1", "rpc:2"],
            nativeCurrency: {
                name: "dolla",
                symbol: "d",
                decimals: 2,
            },
        });

        mockGlue.emit("addethereumchain", event);

        const actual = await promise;

        assert.deepEqual(actual, {
            id: "3",
            type: "addethereumchain",
            chainId: "1",
            blockExplorerUrls: ["explore:1"],
            chainName: "myChain",
            iconUrls: ["icon:1", "icon:2"],
            rpcUrls: ["rpc:1", "rpc:2"],
            nativeCurrency: {
                name: "dolla",
                symbol: "d",
                decimals: 2,
            },
        });
    });

    it("receives switchethereumchain events", async function () {
        await client.subscribe("switchethereumchain");

        const promise = new Promise((res) =>
            client.once("switchethereumchain", res)
        );

        const event = new glue.SwitchEthereumChainEvent("3", {
            chainId: "1",
        });

        mockGlue.emit("switchethereumchain", event);

        const actual = await promise;

        assert.deepEqual(actual, {
            id: "3",
            type: "switchethereumchain",
            chainId: "1",
        });
    });
});
