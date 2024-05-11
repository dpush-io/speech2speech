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
  },
	mounted() {},
	methods: {
		sendMessage() {
			this.avatar.speakNext(this.value)
		},
	},
})
