/**
 * @module tests/unit/IntegrationEngine.test.ts
 * @description Suíte de testes automatizados Vitest para validação de IntegrationEngine.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntegrationEngine } from '../../packages/core/src/public/os/IntegrationEngine';
import { DiscoveryService } from '../../packages/core/src/public/os/DiscoveryService';
import { HealthMonitor } from '../../packages/core/src/public/os/HealthMonitor';
import { HealthStatus, ProtocolManifest } from '../../packages/core/src/public/types/integration.types';

describe('IntegrationEngine', () => {
  let engine: IntegrationEngine;
  let discoveryService: DiscoveryService;
  let healthMonitor: HealthMonitor;

  const mockManifest = {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    description: 'A test plugin',
    author: 'WalletNow',
    website: 'https://walletnow.app',
    capabilities: [{ id: 'test-capability', version: '1.0' }],
    icon: 'test',
  } as unknown as ProtocolManifest;

  beforeEach(() => {
    discoveryService = new DiscoveryService();
    healthMonitor = new HealthMonitor();
    engine = new IntegrationEngine(discoveryService, healthMonitor);
  });

  it('should initialize and discover manifests', async () => {
    vi.spyOn(discoveryService, 'discoverAll').mockResolvedValue([mockManifest]);
    const checkHealthSpy = vi.spyOn(healthMonitor, 'checkHealth').mockResolvedValue({
      status: HealthStatus.ONLINE,
      
      lastCheckedAt: new Date(),
    });

    await engine.initialize();

    expect(discoveryService.discoverAll).toHaveBeenCalled();
    expect(checkHealthSpy).toHaveBeenCalledWith(mockManifest);
  });

  it('should register a local manifest manually', async () => {
    const registerSpy = vi.spyOn(discoveryService, 'registerLocalManifest');
    const checkHealthSpy = vi.spyOn(healthMonitor, 'checkHealth').mockResolvedValue({
      status: HealthStatus.ONLINE,
      
      lastCheckedAt: new Date(),
    });

    await engine.register(mockManifest);

    expect(registerSpy).toHaveBeenCalledWith(mockManifest);
    expect(checkHealthSpy).toHaveBeenCalledWith(mockManifest);
  });

  it('should find manifests by capability', () => {
    vi.spyOn(discoveryService, 'getDiscoveredManifests').mockReturnValue([mockManifest]);
    vi.spyOn(healthMonitor, 'getStatus').mockReturnValue({
      status: HealthStatus.ONLINE,
      lastCheckedAt: new Date(),
    } as any);

    const results = engine.findByCapability('test-capability');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('test-plugin');
  });

  it('should filter out offline manifests by default', () => {
    vi.spyOn(discoveryService, 'getDiscoveredManifests').mockReturnValue([mockManifest]);
    vi.spyOn(healthMonitor, 'getStatus').mockReturnValue({
      status: HealthStatus.OFFLINE,
      
      lastCheckedAt: new Date(),
    });

    const results = engine.findByCapability('test-capability');
    expect(results).toHaveLength(0);
  });

  it('should include offline manifests if excludeOffline is false', () => {
    vi.spyOn(discoveryService, 'getDiscoveredManifests').mockReturnValue([mockManifest]);
    vi.spyOn(healthMonitor, 'getStatus').mockReturnValue({
      status: HealthStatus.OFFLINE,
      
      lastCheckedAt: new Date(),
    });

    const results = engine.findByCapability('test-capability', false);
    expect(results).toHaveLength(1);
  });
});
