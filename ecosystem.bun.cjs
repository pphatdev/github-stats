module.exports = {
    apps: [
        {
            name: 'stats.pphat.top:3102',
            port: 3102,
            exec_mode: 'fork', // cluster might not work with bun nicely
            instances: 1,
            script: './dist/index.js',
            interpreter: 'bun',
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
        {
            name: 'drizzle-studio',
            script: 'bunx',
            args: ['drizzle-kit', 'studio', '--host', '127.0.0.1', '--port', '34222'],
            interpreter: 'none',
            error_file: './logs/drizzle-studio-error.log',
            out_file: './logs/drizzle-studio-output.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
        },
    ],
};
