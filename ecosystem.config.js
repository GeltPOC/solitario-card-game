module.exports = {
  apps: [{
    name: 'solitario-card-game',
    script: 'npm',
    args: 'start -- -p 3276',
    cwd: '/home/gelt/apps/solitario-card-game',
    env: {
      NODE_ENV: 'production',
      PORT: 3276,
    },
  }],
}
