const cp = require('child_process');
const fs = require('fs');
const env = { ...process.env };
const dotEnv = fs.readFileSync('.env', 'utf8').split('\n');
dotEnv.forEach(line => {
    const m = line.match(/^\s*([^#]\w+)\s*=\s*(.*)$/);
    if (m) {
        let val = m[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        env[m[1]] = val;
    }
});
cp.execSync('npx tsx scripts/fix_lunch_count.ts', { env, stdio: 'inherit' });
