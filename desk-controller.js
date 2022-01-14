const axios = require('axios');
const HuddlyDeviceAPIUSB = require('@huddly/device-api-usb').default;
const HuddlySdk = require('@huddly/sdk').default;

const usbApi = new HuddlyDeviceAPIUSB();
const sdk = new HuddlySdk(usbApi, [usbApi]);

let deskMoving = false;
let deskTimeout;

(async () => {
	await sdk.init();

	sdk.on('ATTACH', async (cameraManager) => {
		const detector = await cameraManager.getDetector();
		await detector.init();

		detector.on('DETECTIONS', (detections) => {
			if (!detections.some((d) => d.label === 'head')) return;

			const head = detections.find((d) => d.label === 'head').bbox;
			const x = head.x;
			const y = head.y;

			if (y < 0.4 && x > 0.4 && x < 0.6) {
				deskMove('up');
			} else if (y > 0.5 && x > 0.4 && x < 0.6) {
				deskMove('down');
			} else if (deskMoving) {
				deskReset();
			}
		});

		process.on('SIGINT', async () => {
			await detector.destroy();
			await cameraManager.closeConnection();
			process.exit();
		});
	});
})();

function deskMove(direction) {
	if (deskMoving) return;

	deskTimeout = setTimeout(async () => {
		switch (direction) {
			case 'up':
				await deskApi('up');
				break;
			case 'down':
				await deskApi('down');
				break;
		}

		deskMoving = true;
	}, 2000);
}

async function deskReset() {
	deskMoving = false;
	clearTimeout(deskTimeout);
	await deskApi('reset');
}

async function deskApi(action) {
	const host = 'http://deskpi.local:8080';
	try {
		console.log(`Action: ${action}`);
		// await axios.get(`${host}/api/${action}`);
	} catch (err) {
		console.error(err);
	}
}
