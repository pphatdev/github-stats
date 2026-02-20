module.exports = {
    apps: [
        {
            name: 'stats.pphat.top:3102',
            port: 3102,
            exec_mode: 'cluster',
            instances: 'max',
            script: './dist/index.js',
            env: {
                NODE_ENV: 'production',
                PORT: 3102,
            },
            error_file: './logs/error.log',
            out_file: './logs/output.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            merge_logs: true,

            max_restarts: 10,
            min_uptime: '10s',
            max_memory_restart: '500M'
        },
    ],
};
