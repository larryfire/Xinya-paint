#!/usr/bin/env python3
"""通过 SSH 将公钥添加到远程服务器，使用密码认证。"""
import subprocess
import sys
import os

PUBKEY_PATH = os.path.expanduser("~/.ssh/temp_deploy_key.pub")
SERVER = "ubuntu@124.221.38.173"
PASSWORD = "1420998360Ll"

# 读取公钥
with open(PUBKEY_PATH) as f:
    pubkey = f.read().strip()

# 构建远程命令：创建 .ssh 目录并追加公钥
remote_cmd = f"mkdir -p ~/.ssh && echo '{pubkey}' >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys && echo 'KEY_ADDED_OK'"

# 使用 ssh 连接（密码通过 stdin 传入）
cmd = [
    "ssh",
    "-o", "StrictHostKeyChecking=no",
    "-o", "PreferredAuthentications=password",
    "-o", "PubkeyAuthentication=no",
    "-T",
    SERVER,
    remote_cmd
]

print(f"正在连接 {SERVER} ...")
proc = subprocess.Popen(
    cmd,
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)

try:
    stdout, stderr = proc.communicate(input=f"{PASSWORD}\n", timeout=15)
    print("STDOUT:", stdout.strip())
    if stderr.strip():
        print("STDERR:", stderr.strip())
    print(f"返回码: {proc.returncode}")

    if "KEY_ADDED_OK" in stdout:
        print("\n✅ 公钥已成功添加到服务器！")
        sys.exit(0)
    else:
        print("\n❌ 公钥添加失败")
        sys.exit(1)
except subprocess.TimeoutExpired:
    proc.kill()
    print("❌ 连接超时")
    sys.exit(1)
