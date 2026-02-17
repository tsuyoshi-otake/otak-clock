import * as assert from 'assert';

import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    test('registers commands on activation', async () => {
        const extension = vscode.extensions.getExtension('odangoo.otak-clock');
        assert.ok(extension, 'Extension not found (expected id: odangoo.otak-clock)');

        await extension.activate();

        const commands = await vscode.commands.getCommands(true);
        const expected = [
            'otak-clock.selectTimeZone1',
            'otak-clock.selectTimeZone2',
            'otak-clock.swapTimeZones',
            'otak-clock.setAlarm',
            'otak-clock.toggleAlarm',
            'otak-clock.editAlarm',
            'otak-clock.deleteAlarm',
            'otak-clock.listAlarms'
        ];

        for (const id of expected) {
            assert.ok(commands.includes(id), `Command not registered: ${id}`);
        }
    });
});
