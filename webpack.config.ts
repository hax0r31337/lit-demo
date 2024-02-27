import path from 'path';
import fs from 'fs';
import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import HtmlParser from 'node-html-parser';
import ESLintPlugin from 'eslint-webpack-plugin';
import CopyPlugin from 'copy-webpack-plugin';

let config: webpack.Configuration = {
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
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: path.resolve(__dirname, 'assets'), to: path.resolve(__dirname, 'dist', 'assets') },
            ],
        }),
    ],
    optimization: {
        chunkIds: 'deterministic',
        splitChunks: {
            chunks: 'all',
        },
    }
}


function findFilesInSubdirs(dir: string, filter: (filename: string) => boolean): string[] {
    const files: string[] = [];
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

const pagesDir = path.resolve(__dirname, 'src', 'pages');
findFilesInSubdirs(pagesDir, file => file.endsWith('.html') || file.endsWith('.ejs'))
    .forEach(file => {
        const dom = HtmlParser.parse(fs.readFileSync(file, 'utf8'));
        var options: HtmlWebpackPlugin.Options = {
            filename: path.relative(pagesDir, file),
            chunks: [],
            scriptLoading: 'module',
            chunksSortMode: 'manual',
            xhtml: true,
        }

        // get scripts
        dom.querySelectorAll('script').forEach(script => {
            const src = script.getAttribute('src');
            const dir = path.resolve(path.dirname(file), src!);

            if (fs.existsSync(dir)) {
                if (Array.isArray(options.chunks)) {
                    options.chunks.push(dir);
                }
                (config.entry as Record<string, string>)[dir] = dir;
            }

            script.remove();
        });

        options.templateContent = dom.toString();

        config.plugins!.push(new HtmlWebpackPlugin(options));
    });

export default (_env: any, argv: { mode: string }) => {
    if (argv.mode === 'production') {
        // enable ESLint in production only
        config.plugins!.push(
            new ESLintPlugin({
                extensions: ['js', 'ts'],
                threads: true,
            })
        )
    }
    return config;
};