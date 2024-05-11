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
    load() {
      this.avatar.connectAvatar()
    },
    stop() {
      this.avatar.disconnectAvatar()
    }
	},
})
