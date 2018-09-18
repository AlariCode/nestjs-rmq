import { expect } from 'chai';
import { ServerRMQ } from '../lib/server';
import * as sinon from 'sinon';

const server = new ServerRMQ({});

describe('listen()', () => {

    beforeEach(() => {
        (server as any).start = sinon.spy();
    });

    it('should call start', () => {
        server.listen();
        expect((server as any).start.called).to.be.true;
    });
});

describe('close()', () => {
    beforeEach(() => {
        (server as any).channel = {
            close: sinon.spy()
        };
        (server as any).server = {
            close: sinon.spy()
        };
    });

    it('should close channel', () => {
        server.close();
        expect((server as any).channel.close.called).to.be.true;
    });

    it('should close server', () => {
        server.close();
        expect((server as any).server.close.called).to.be.true;
    });
});

describe('sendMessage()', () => {
    beforeEach(() => {
        (server as any).channel = {
            sendToQueue: sinon.spy()
        };
    });

    it('should send to queue', () => {
        server['sendMessage']('', '', '');
        expect((server as any).channel.sendToQueue.called).to.be.true;
    });
});

describe('handleMessage()', () => {
    const message = {
        content: JSON.stringify({
            pattern: 'test',
            data: 'testdata'
        }),
        properties: {
            replyTo: 'testReply',
            correlationId: 'testCorId'
        },
    };
    beforeEach(() => {
        (server as any).transformToObservable = sinon.spy();
    });

    it('should call handler if exists', () => {
        (server as any).messageHandlers[JSON.stringify('test')] = sinon.spy();
        server['handleMessage'](message);
        expect((server as any).messageHandlers[JSON.stringify('test')].called).to.be.true;
    });

    it('should not call handler if not exists', () => {
        (server as any).messageHandlers[JSON.stringify('tests')] = sinon.spy();
        server['handleMessage'](message);
        expect((server as any).messageHandlers[JSON.stringify('tests')].called).to.be.false;
    });
});
