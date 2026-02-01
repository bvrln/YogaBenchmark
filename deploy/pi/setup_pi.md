# Raspberry Pi deployment (systemd + Tailscale)

This keeps the Yoga Benchmark app running permanently on the Pi and reachable via Tailscale.

## 1) Copy project to the Pi
From your workstation:
```bash
scp -r "c:/Users/Bram Verlaan/Documents/Projects/Python/Yoga price benchmark" bram@<pi-ip>:/home/bram/yoga-price-benchmark
```

## 2) Install Python and create a venv (on the Pi)
```bash
sudo apt-get update
sudo apt-get install -y python3 python3-venv python3-pip
cd /home/bram/yoga-price-benchmark
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 3) Install the systemd service
```bash
sudo cp /home/bram/yoga-price-benchmark/deploy/pi/yoga-benchmark.service /etc/systemd/system/yoga-benchmark.service
sudo systemctl daemon-reload
sudo systemctl enable yoga-benchmark
sudo systemctl start yoga-benchmark
sudo systemctl status yoga-benchmark
```

## 4) Access via Tailscale
On the Pi:
```bash
tailscale status
```
Use the Tailscale IP (e.g., `100.x.y.z`) from your laptop:
```
http://<tailscale-ip>:8000
```

## 5) Update workflow
```bash
cd /home/bram/yoga-price-benchmark
git pull
source .venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart yoga-benchmark
```

## 6) Weekly refresh timer (optional)
```bash
sudo cp /home/bram/yoga-price-benchmark/deploy/pi/yoga-benchmark-refresh.service /etc/systemd/system/yoga-benchmark-refresh.service
sudo cp /home/bram/yoga-price-benchmark/deploy/pi/yoga-benchmark-refresh.timer /etc/systemd/system/yoga-benchmark-refresh.timer
sudo systemctl daemon-reload
sudo systemctl enable --now yoga-benchmark-refresh.timer
sudo systemctl list-timers | grep yoga-benchmark-refresh
```

## Troubleshooting
- Logs: `journalctl -u yoga-benchmark -f`
- Port in use: `sudo ss -tulpn | grep 8000`
