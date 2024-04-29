class AudioPlayer {
	constructor() {
		// 创建 AudioContext
		this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
		this.audioIndex = 0
		this.arrayBuffers = []
		this.isDecoding = false
		this.source = null
	}

	// 加载音频文件并解码为音频缓冲区
	loadAudioFile(arrayBuffer) {
		if (arrayBuffer.byteLength < 10) {
			return
		}
		this.arrayBuffers.push(arrayBuffer)
		this.playNextAudio()
	}

	// 创建播放音频的方法
	playAudio(arrayBUffer) {
		const self = this
		this.audioContext.decodeAudioData(arrayBUffer).then((buffer) => {
			self.createBufferSource(buffer)
		})
	}

	createBufferSource(buffer, offset, duration) {
		this.source = this.audioContext.createBufferSource()
		this.source.buffer = buffer

		this.source.connect(this.audioContext.destination)

		// 播放音频
		this.source.start(0, offset, duration)

		// 监听音频结束事件
		this.source.onended = () => {
      console.log("Audio playback ended.")
      this.isDecoding = false
      this.playNextAudio()
		}
	}

	stopAudio() {
		if (this.source) {
			this.isDecoding = false
			this.arrayBuffers = []
			this.audioIndex = 0
			this.source.stop()
		}
	}

  // 暂停播放
	pauseAudio() {
    this.audioContext.suspend();
	}

  // 恢复播放
	resumeAudio() {
    this.audioContext.resume();
	}

	// 播放下一个音频
	playNextAudio() {
		if (this.audioIndex < this.arrayBuffers.length && !this.isDecoding) {
			this.isDecoding = true
			this.playAudio(this.arrayBuffers[this.audioIndex++])
		}
	}
}
