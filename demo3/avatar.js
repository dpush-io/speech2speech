// Do HTML encoding on given text
const htmlEncode = (text) => {
	const entityMap = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#39;",
		"/": "&#x2F;",
	}

	return String(text).replace(/[&<>"'\/]/g, (match) => entityMap[match])
}

class Avatar {
	constructor() {
		this.cogSvcRegion = "westus2"
		this.cogSvcSubKey = "999419f958e34a6a8f126607fcea642d"
		this.endpointId = ""
		this.talkingAvatarCharacter = "lisa"
		this.talkingAvatarStyle = "casual-sitting"
		this.ttsVoice = "zh-CN-XiaoxiaoNeural"
		this.customized = false
		this.avatarSynthesizer = null
		this.speechRecognizer = null
		this.dataSources = []
		this.messageInitiated = false
    this.sessionActive = false

		this.messages = []

		this.spokenTextQueue = []
		this.isSpeaking = false

		this.connectAvatar()
	}

	// Connect to avatar service
	connectAvatar = () => {
		const cogSvcRegion = this.cogSvcRegion
		const cogSvcSubKey = this.cogSvcSubKey

		let speechSynthesisConfig
		speechSynthesisConfig = SpeechSDK.SpeechConfig.fromSubscription(
			cogSvcSubKey,
			cogSvcRegion
		)
		speechSynthesisConfig.endpointId = this.endpointId

		const talkingAvatarCharacter = this.talkingAvatarCharacter
		const talkingAvatarStyle = this.talkingAvatarStyle
		const avatarConfig = new SpeechSDK.AvatarConfig(
			talkingAvatarCharacter,
			talkingAvatarStyle
		)
		avatarConfig.customized = false
		this.avatarSynthesizer = new SpeechSDK.AvatarSynthesizer(
			speechSynthesisConfig,
			avatarConfig
		)
		this.avatarSynthesizer.avatarEventReceived = function (s, e) {
			var offsetMessage =
				", offset from session start: " + e.offset / 10000 + "ms."
			if (e.offset === 0) {
				offsetMessage = ""
			}

			console.log("Event received: " + e.description + offsetMessage)
		}

		const speechRecognitionConfig = SpeechSDK.SpeechConfig.fromEndpoint(
			new URL(
				`wss://${cogSvcRegion}.stt.speech.microsoft.com/speech/universal/v2`
			),
			cogSvcSubKey
		)
		speechRecognitionConfig.setProperty(
			SpeechSDK.PropertyId.SpeechServiceConnection_LanguageIdMode,
			"Continuous"
		)
		var sttLocales = "en-US,de-DE,es-ES,fr-FR,it-IT,ja-JP,ko-KR,zh-CN".split(
			","
		)
		var autoDetectSourceLanguageConfig =
			SpeechSDK.AutoDetectSourceLanguageConfig.fromLanguages(sttLocales)
		this.speechRecognizer = SpeechSDK.SpeechRecognizer.FromConfig(
			speechRecognitionConfig,
			autoDetectSourceLanguageConfig,
			SpeechSDK.AudioConfig.fromDefaultMicrophoneInput()
		)

		this.dataSources = []

		// Only initialize messages once
		if (!this.messageInitiated) {
			this.initMessages()
			this.messageInitiated = true
		}

		const xhr = new XMLHttpRequest()

		xhr.open(
			"GET",
			`https://${cogSvcRegion}.tts.speech.microsoft.com/cognitiveservices/avatar/relay/token/v1`
		)
		xhr.setRequestHeader("Ocp-Apim-Subscription-Key", cogSvcSubKey)
		xhr.addEventListener("readystatechange", () => {
			if (xhr.readyState === 4) {
				const responseData = JSON.parse(xhr.responseText)
				const iceServerUrl = responseData.Urls[0]
				const iceServerUsername = responseData.Username
				const iceServerCredential = responseData.Password
				this.setupWebRTC(iceServerUrl, iceServerUsername, iceServerCredential)
			}
		})
		xhr.send()
	}

	// Setup WebRTC
	setupWebRTC = (iceServerUrl, iceServerUsername, iceServerCredential) => {
		console.log("setupWebRTC")
		let peerConnection
		// Create WebRTC peer connection
		peerConnection = new RTCPeerConnection({
			iceServers: [
				{
					urls: [iceServerUrl],
					username: iceServerUsername,
					credential: iceServerCredential,
				},
			],
		})

		// Fetch WebRTC video stream and mount it to an HTML video element
		peerConnection.ontrack = function (event) {
			console.log(event, "peerConnection event")
			// Clean up existing video element if there is any
			const remoteVideoDiv = document.getElementById("remoteVideo")
			for (var i = 0; i < remoteVideoDiv.childNodes.length; i++) {
				if (remoteVideoDiv.childNodes[i].localName === event.track.kind) {
					remoteVideoDiv.removeChild(remoteVideoDiv.childNodes[i])
				}
			}

			if (event.track.kind === "audio") {
				let audioElement = document.createElement("audio")
				audioElement.id = "audioPlayer"
				audioElement.srcObject = event.streams[0]
				audioElement.autoplay = true

				audioElement.onplaying = () => {
					console.log(`WebRTC ${event.track.kind} channel connected.`)
				}

				document.getElementById("remoteVideo").appendChild(audioElement)
			}

			if (event.track.kind === "video") {
				document.getElementById("remoteVideo").style.width = "0.1px"

				let videoElement = document.createElement("video")
				videoElement.id = "videoPlayer"
				videoElement.srcObject = event.streams[0]
				videoElement.autoplay = true
				videoElement.playsInline = true

				videoElement.onplaying = () => {
					console.log(`WebRTC ${event.track.kind} channel connected.`)
					document.getElementById("remoteVideo").style.width = "960px"

					setTimeout(() => {
						this.sessionActive = true
					}, 5000) // Set session active after 5 seconds
				}

				document.getElementById("remoteVideo").appendChild(videoElement)
			}
		}

		// Make necessary update to the web page when the connection state changes
		peerConnection.oniceconnectionstatechange = (e) => {
			console.log("WebRTC status: " + peerConnection.iceConnectionState)
		}

		// Offer to receive 1 audio, and 1 video track
		peerConnection.addTransceiver("video", { direction: "sendrecv" })
		peerConnection.addTransceiver("audio", { direction: "sendrecv" })

		// start avatar, establish WebRTC connection
		this.avatarSynthesizer
			.startAvatarAsync(peerConnection)
			.then((r) => {
				if (r.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
					console.log(
						"[" +
							new Date().toISOString() +
							"] Avatar started. Result ID: " +
							r.resultId
					)
					console.log(r, "Avatar started. Result rrrrrrrrr")
				} else {
					console.log(
						"[" +
							new Date().toISOString() +
							"] Unable to start avatar. Result ID: " +
							r.resultId
					)
					if (r.reason === SpeechSDK.ResultReason.Canceled) {
						let cancellationDetails =
							SpeechSDK.CancellationDetails.fromResult(r)
						if (
							cancellationDetails.reason === SpeechSDK.CancellationReason.Error
						) {
							console.log(cancellationDetails.errorDetails)
						}

						console.log(
							"Unable to start avatar: " + cancellationDetails.errorDetails
						)
					}
				}
			})
			.catch((error) => {
				console.log(
					"[" +
						new Date().toISOString() +
						"] Avatar failed to start. Error: " +
						error
				)
			})
	}

	// Initialize messages
	initMessages = () => {
		this.messages = []

		if (this.dataSources.length === 0) {
			let systemMessage = {
				role: "system",
				content: "",
			}

			this.messages.push(systemMessage)
		}
	}

	speakNext = (text, endingSilenceMs = 0) => {
		console.log(text)
		let ttsVoice = this.ttsVoice
		let personalVoiceSpeakerProfileID = ""
		let ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='http://www.w3.org/2001/mstts' xml:lang='en-US'><voice name='${ttsVoice}'><mstts:ttsembedding speakerProfileId='${personalVoiceSpeakerProfileID}'><mstts:leadingsilence-exact value='0'/>${htmlEncode(
			text
		)}</mstts:ttsembedding></voice></speak>`
		if (endingSilenceMs > 0) {
			ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='http://www.w3.org/2001/mstts' xml:lang='en-US'><voice name='${ttsVoice}'><mstts:ttsembedding speakerProfileId='${personalVoiceSpeakerProfileID}'><mstts:leadingsilence-exact value='0'/>${htmlEncode(
				text
			)}<break time='${endingSilenceMs}ms' /></mstts:ttsembedding></voice></speak>`
		}

		let lastSpeakTime = new Date()
		this.isSpeaking = true
		this.avatarSynthesizer
			.speakSsmlAsync(ssml)
			.then((result) => {
				console.log(result)
				if (
					result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted
				) {
					console.log(
						`Speech synthesized to speaker for text [ ${text} ]. Result ID: ${result.resultId}`
					)
					lastSpeakTime = new Date()
				} else {
					console.log(
						`Error occurred while speaking the SSML. Result ID: ${result.resultId}`
					)
				}

				if (this.spokenTextQueue.length > 0) {
					this.speakNext(spokenTextQueue.shift())
				} else {
					this.isSpeaking = false
				}
			})
			.catch((error) => {
				console.log(`Error occurred while speaking the SSML: [ ${error} ]`)

				if (spokenTextQueue.length > 0) {
					this.speakNext(spokenTextQueue.shift())
				} else {
					this.isSpeaking = false
				}
			})
	}
}
