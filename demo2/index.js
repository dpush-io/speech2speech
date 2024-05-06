const app = new Vue({
	el: "#app",
	data: {
		status: "连接已断开",
		history: [],
		audioPlayer: new AudioPlayer(),
		aiWS: null,
		recorder: new RecorderManager("./"),
		isSpeak: false,
		// 录音转文字结果
		recordeResult: '',
		// ai回复结果
		repplyResult: '',
		value: '杨喆和何雪婷的爱情故事 ',
	},
	watch: {
		isSpeak(newVal) {
			console.log("isSpeak: ", newVal)
			if (newVal) {
				// 正在说话，停止音频
				this.audioPlayer.stopAudio()
			}
		},
	},
	computed: {
		serverUrl() {
			return window.location.host.includes('127.0.0.1') ? "http://192.168.50.25:3003" : "https://rts.reportsay.cn/tospeech"
		}
	},
	created() {},
	mounted() {
		this.recorder.onFrameRecorded = ({ isLastFrame, frameBuffer }) => {
			if (this.aiWS && this.aiWS.readyState === this.aiWS.OPEN) {
				this.status = "ws已连接, 录音开启"
				this.aiWS.send(new Int8Array(frameBuffer))
				if (isLastFrame) {
					this.aiWS.send('{"end": true}')
					this.status = "ws已连接, 录音关闭"
				}
			}
		}
		this.recorder.onStop = () => {
			this.status = "ws已连接, 录音关闭"
		}
	},
	methods: {
		sendMessage() {
			this.aiWS.send(this.value)
		},
		startChat: function () {
			if (this.aiWS && this.aiWS.readyState === this.aiWS.OPEN) {
				if (this.status === "ws已连接, 录音关闭") {
					this.recorder.start({
						sampleRate: 16000,
						frameSize: 1280,
					})
				} else {
					this.recorder.stop()
				}
			} else {
				this.connectSocket()
			}
		},
		getRecord(data) {
			if (data.type === 'stt') {
				const key = 'recordeResult'
				if (data.isEnd) {
					this.history.push({ role: 'user', contact: data.result, date: data.date })
					this[key] = ''
				} else {
					this[key] = data.result
				}
			} else if (data.type === 'lla') {
				const key = 'repplyResult'
				if (data.isEnd) {
					this.history.push({ role: 'ai', contact: this[key], date: data.date })
					this[key] = ''
				} else {
					this[key] = this[key] + data.result
				}
			} else if (data.type === 'photo') {
				// let blob = new Blob([data.data], { type: 'image/jpeg' }); // 假设这里是JPEG图像格式
				// let imageUrl = URL.createObjectURL(blob);
				this.repplyResult += `<img src="${this.serverUrl}/image/${encodeURIComponent(data.fileName)}" class="image" />`
			}
			console.log(this.history)
		},
		connectSocket: function () {
			return new Promise((resolve, reject) => {
				const websocketUrl =  window.location.host.includes('127.0.0.1') ? "ws://192.168.50.25:3003" : "wss://rts.reportsay.cn/tospeech"
				if ("WebSocket" in window) {
					this.aiWS = new WebSocket(websocketUrl)
				} else if ("MozWebSocket" in window) {
					this.aiWS = new MozWebSocket(websocketUrl)
				} else {
					alert("浏览器不支持WebSocket")
					return
				}
				this.status = "正在连接ws"
				this.aiWS.onopen = (e) => {
					// 开始录音
					this.recorder.start({
						sampleRate: 16000,
						frameSize: 1280,
					})
					resolve(e)
				}
				this.aiWS.onmessage = (e) => {
					if (typeof e.data === "string") {
						try {
							const temp = JSON.parse(e.data)
							if (temp.isSpeak !== undefined) {
								this.isSpeak = temp.isSpeak
							}
							if (temp.type) {
								this.getRecord(temp)
							}
							console.log("message JSON data: ", temp)
						} catch (error) {
							console.error("message data is not JSON", error)
						}
					} else {
						if (!this.isSpeak) {
							this.audioPlayer.loadAudioFile(e.data)
						}
					}
				}
				this.aiWS.onerror = (e) => {
					this.status = "连接已断开"
					this.recorder.stop()
					reject("error", e)
					console.error(e)
				}
				this.aiWS.onclose = (e) => {
					this.status = "连接已断开"
					this.recorder.stop()
					reject("error", e)
				}
			})
		},
	},
})
