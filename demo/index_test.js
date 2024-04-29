;(function () {
	let btnStatus = "UNDEFINED" // "UNDEFINED" "CONNECTING" "OPEN" "CLOSING" "CLOSED"

	const btnControl = document.getElementById("btn_control")
	const inputDom = document.getElementById("value")
	const sendDom = document.getElementById("btn_send")
	const connectionStatus = document.getElementById("connection_status");

	const audioContext = new AudioContext();
	let audioBufferQueue = [];
	let isPlaying = false;

	const recorder = new RecorderManager("./")
	recorder.onStart = () => {
		changeBtnStatus("OPEN")
	}
	let iatWS
	let aiWS

	let resultText = ""
	let resultTextTemp = ""
	let countdownInterval

	let answer = {
		resultText: "",
		resultTextTemp: "",
	}

	// tts.addText('电动车的寿命')

	function sendMsg(msg) {
		if (aiWS && aiWS.readyState === aiWS.OPEN) {
			aiWS.send(
				JSON.stringify({
					message: msg,
					generalize: false,
					is_summary: false,
					current_docid: 1,
					current_page: 1,
					conversation_id: "test_conversation",
				})
			)
		}
	}
	// tts('握手成功');
	// console.log(browserSound.currentTime);
	// browserSound.write(result.audioDahenta, () => {
	// 	console.log('success');
	// })

	/**
	 * 获取websocket url
	 * 该接口需要后端提供，这里为了方便前端处理
	 */
	function getWebSocketUrl() {
		// 请求地址根据语种不同变化
		var url = "wss://rts.reportsay.cn/rr" //"wss://rtasr.xfyun.cn/v1/ws"
		return `${url}`
	}

	function changeBtnStatus(status) {
		btnStatus = status
		if (status === "CONNECTING") {
			btnControl.innerText = "建立连接中"
			document.getElementById("result").innerText = ""
			resultText = ""
			resultTextTemp = ""
		} else if (status === "OPEN") {
			btnControl.innerText = "录音中"
		} else if (status === "CLOSING") {
			btnControl.innerText = "关闭连接中"
		} else if (status === "CLOSED") {
			btnControl.innerText = "开始录音"
		}
	}

	function renderResult(resultData) {
		let jsonData = JSON.parse(resultData)
		if (jsonData.action == "started") {
			// 握手成功
			console.log("握手成功")
		} else if (jsonData.action == "result") {
			const data = JSON.parse(jsonData.data)
			console.log(data)
			// 转写结果
			let resultTextTemp = ""
			data.cn.st.rt.forEach((j) => {
				j.ws.forEach((k) => {
					k.cw.forEach((l) => {
						resultTextTemp += l.w
					})
				})
			})

			if (data.cn.st.type == 0) {
				// 【最终】识别结果：
				resultText += resultTextTemp
				resultTextTemp = ""
			}

			console.log("result", resultText, "resultTextTemp", resultTextTemp)
			document.getElementById("result").innerText = resultText + resultTextTemp
			inputDom.value = resultText + resultTextTemp
		} else if (jsonData.action == "error") {
			// 连接发生错误
			console.log("出错了:", jsonData)
		}
	}

	 
	// 连接讯飞，转文字
	function connectWebSocket() {
		const websocketUrl = getWebSocketUrl()
		if ("WebSocket" in window) {
			iatWS = new WebSocket(websocketUrl)
		} else if ("MozWebSocket" in window) {
			iatWS = new MozWebSocket(websocketUrl)
		} else {
			alert("浏览器不支持WebSocket")
			return
		}
		changeBtnStatus("CONNECTING")
		iatWS.onopen = (e) => {
			// 开始录音
			recorder.start({
				sampleRate: 16000,
				frameSize: 1280,
			})
		}
		iatWS.onmessage = (e) => {
			console.info("received message:", e.data, typeof e.data)
        console.info("消息收到时间:"+Date.now());
        if (e.data instanceof Blob) {
          playAudio(e.data);
        }
        else
        {

           //console.info("received message:", e.data, typeof e.data)
        } 

			//renderResult(e.data)
		}
		iatWS.onerror = (e) => {
			console.error(e)
			recorder.stop()
			changeBtnStatus("CLOSED")
		}
		iatWS.onclose = (e) => {
			recorder.stop()
			changeBtnStatus("CLOSED")
		}
	}



  function playAudio(audioData) {
    const fileReader = new FileReader();
    fileReader.onload = function() {
      const arrayBuffer = fileReader.result;
      audioContext.decodeAudioData(arrayBuffer, buffer => {
        audioBufferQueue.push(buffer);
        if (!isPlaying) {
          playFromBuffer();
        }
      }, error => {
        console.error("Error decoding audio data", error);
      });
    };
    fileReader.readAsArrayBuffer(audioData);
  }

  function playFromBuffer() {
    if (audioBufferQueue.length > 0) {
      const buffer = audioBufferQueue.shift();
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(audioContext.currentTime);
      source.onended = playFromBuffer;
      isPlaying = true;
    } else {
      isPlaying = false;
    }
  }

	recorder.onFrameRecorded = ({ isLastFrame, frameBuffer }) => {
		if (iatWS && iatWS.readyState === iatWS.OPEN) {
			iatWS.send(new Int8Array(frameBuffer))
			if (isLastFrame) {
				iatWS.send('{"end": true}')
				changeBtnStatus("CLOSING")
			}
		}
	}
	recorder.onStop = () => {
		clearInterval(countdownInterval)
	}

	btnControl.onclick = function () {
		if (btnStatus === "UNDEFINED" || btnStatus === "CLOSED") {
			connectWebSocket()
		} else if (btnStatus === "CONNECTING" || btnStatus === "OPEN") {
			// 结束录音
			recorder.stop()
			changeBtnStatus("CLOSED")
		}
	}
	 
})()
