import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import HtmlParser from 'node-html-parser';
import ESLintPlugin from 'eslint-webpack-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let config = {
    entry: {},
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    output: {
        filename: 'scripts/[chunkhash].js',
        path: path.resolve(__dirname, 'dist'),
        clean: true,
    },
    plugins: [],
    optimization: {
        chunkIds: 'deterministic',
        splitChunks: {
            chunks: 'all',
        },
    }
}


function findFilesInSubdirs(dir, filter) {
    const files = [];
    fs.readdirSync(dir).forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            files.push(...findFilesInSubdirs(filePath, filter)); // Recursion
        } else if (filter(file)) {
            files.push(filePath);
        }
    });
    return files;
}

const pagesDir = path.resolve(__dirname, 'src/pages');
findFilesInSubdirs(pagesDir, file => file.endsWith('.html') || file.endsWith('.ejs'))
    .forEach(file => {
        const dom = HtmlParser.parse(fs.readFileSync(file, 'utf8'));
        var options = {
            filename: path.relative(pagesDir, file),
            chunks: [],
            scriptLoading: 'module',
            chunksSortMode: 'manual',
            xhtml: true,
        }

        // get scripts
        dom.querySelectorAll('script').forEach(script => {
            const src = script.getAttribute('src');
            const dir = path.resolve(path.dirname(file), src);

            if (fs.existsSync(dir)) {
                options.chunks.push(dir);
                config.entry[dir] = dir;
            }

            script.remove();
        });

        options.templateContent = dom.toString();

        config.plugins.push(new HtmlWebpackPlugin(options));
    });

export default (env, argv) => {
    if (argv.mode === 'production') {
        // enable ESLint in production only
        config.plugins.push(
            new ESLintPlugin({
                extensions: ['js', 'ts'],
                threads: true,
            })
        )
    }
    return config;
};