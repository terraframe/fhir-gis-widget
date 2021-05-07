module.exports = {
  devServer: {
    proxy: {
      '^/Location': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
    }
  },

  transpileDependencies: [
    'vuetify'
  ]
}
