const util = require('util');
const exec = util.promisify(require('child_process').exec);
const HuddlyDeviceAPIUSB = require('@huddly/device-api-usb').default;
const HuddlySdk = require('@huddly/sdk').default;

const usbApi = new HuddlyDeviceAPIUSB();
const sdk = new HuddlySdk(usbApi, [usbApi]);

let lockTimeout;

(async () => {
	await sdk.init();

	sdk.on('ATTACH', async (cameraManager) => {
		const detector = await cameraManager.getDetector();
		await detector.init();

		detector.on('DETECTIONS', (detections) => {
			if (
				!detections.some((d) => d.label === 'person') ||
				detections.find((d) => d.label === 'person').bbox.width < 0.3
			) {
				lockMac();
			}
		});

		process.on('SIGINT', async () => {
			await detector.destroy();
			await cameraManager.closeConnection();
			process.exit();
		});
	});
})();

function lockMac() {
	if (lockTimeout) return;

	lockTimeout = setTimeout(async () => {
		try {
			console.log('Locking mac...');
			exec('pmset displaysleepnow');
		} catch (error) {
			console.error(error);
		} finally {
			lockTimeout = null;
		}
	}, 5000);
}
