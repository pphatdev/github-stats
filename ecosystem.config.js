module.exports = {
    apps: [
        {
            name: 'github-stats',
            script: './dist/index.js',
            instances: 'max',
            exec_mode: 'cluster',
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env_production: {
                NODE_ENV: 'production',
                PORT: 3102
            },
            error_file: './logs/err.log',
            out_file: './logs/out.log',
            log_file: './logs/combined.log',
            time: true,
            merge_logs: true,
            kill_timeout: 5000,
            wait_ready: true,
            listen_timeout: 10000,
            shutdown_with_message: true
        }
    ],
};
