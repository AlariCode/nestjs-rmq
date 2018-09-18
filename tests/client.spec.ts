import { expect } from 'chai';
import { ClientRMQ } from '../lib/client';
import * as sinon from 'sinon';
import { EventEmitter } from 'events';

const client = new ClientRMQ({});

describe('listen()', () => {

    beforeEach(() => {
        (client as any).channel = {
            addSetup: sinon.spy(),
        };
    });

    it('should call start', () => {
        client.listen();
        expect((client as any).channel.addSetup.called).to.be.true;
    });
});

describe('close()', () => {
    beforeEach(() => {
        (client as any).channel = {
            close: sinon.spy()
        };
        (client as any).client = {
            close: sinon.spy()
        };
    });

    it('should close channel', () => {
        client.close();
        expect((client as any).channel.close.called).to.be.true;
    });

    it('should close client', () => {
        client.close();
        expect((client as any).client.close.called).to.be.true;
    });
});

describe('publish()', () => {
    beforeEach(() => {
        (client as any).connect = sinon.spy();
        (client as any).channel = {
            sendToQueue: sinon.spy(),
        };
        (client as any).responseEmitter = new EventEmitter();
    });

    it('should connect if not connected', () => {
        (client as any).client = null;
        client['publish']('', x => {});
        expect((client as any).connect.called).to.be.true;
    });

    it('should not connect if connected', () => {
        (client as any).client = true;
        client['publish']('', x => {});
        expect((client as any).connect.called).to.be.false;
    });

    it('should call sendToQueue', () => {
        (client as any).client = true;
        client['publish']('', x => {});
        expect((client as any).channel.sendToQueue.called).to.be.true;
    });
});

describe('handleMessage()', () => {
    beforeEach(() => {

    });

    it('should dispose if error', () => {
        const message = {
            content: JSON.stringify({
                err: true,
                response: 'test',
                isDisposed: false,
            }),
        };
        let callback = sinon.spy();
        client['handleMessage'](message, callback);
        expect(callback.withArgs({
            err: true,
            response: null,
            isDisposed: true,
        }).calledOnce).to.be.true;
    });

    it('should dispose if disposed', () => {
        const message = {
            content: JSON.stringify({
                err: false,
                response: 'test',
                isDisposed: true,
            }),
        };
        let callback = sinon.spy();
        client['handleMessage'](message, callback);
        expect(callback.withArgs({
            err: false,
            response: null,
            isDisposed: true,
        }).calledOnce).to.be.true;
    });

    it('should callback if no error', () => {
        const message = {
            content: JSON.stringify({
                err: false,
                response: 'test',
                isDisposed: false,
            }),
        };
        let callback = sinon.spy();
        client['handleMessage'](message, callback);
        expect(callback.withArgs({
            err: false,
            response: 'test',
        }).calledOnce).to.be.true;
    });
});