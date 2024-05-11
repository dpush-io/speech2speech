const app = new Vue({
	el: "#app",
	data: {
		repplyResult: '',
		value: '杨喆和何雪婷的爱情故事 ',
    avatar: null,
	},
	watch: {},
	computed: {},
	created() {
    this.avatar = new Avatar()
    window.addEventListener('beforeunload', (event) => {   
      this.stop()
      const confirmationMessage = '您确定要离开本页面吗？';
      event.returnValue = confirmationMessage; // 兼容旧版本浏览器
      return confirmationMessage;
    });
  },
	mounted() {},
  beforeDestroy() {
    this.stop()
  },
	methods: {
		sendMessage() {
			this.avatar.speakNext(this.value)
		},
    stop() {
      this.avatar.disconnectAvatar()
    }
	},
})
