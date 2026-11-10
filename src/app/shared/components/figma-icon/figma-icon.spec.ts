import { TestBed } from '@angular/core/testing';
import { FigmaIcon } from './figma-icon';
import { ICON_ASSETS, iconResource } from './icon-assets';

describe('Ícones compartilhados', () => {
  afterEach(() => document.documentElement.removeAttribute('data-theme'));

  it('carrega todos os arquivos locais, incluindo SVGs, PNGs e o favicon', async () => {
    const paths = [...new Set(Object.values(ICON_ASSETS).map(path => '/icons/' + path)), '/icons/favicon.ico'];
    await Promise.all(paths.map(async path => {
      const image = new Image();
      image.src = path;
      await image.decode().catch(() => fail('Ícone não carregou: ' + path));
      expect(image.naturalWidth).withContext(path).toBeGreaterThan(0);
      expect(image.naturalHeight).withContext(path).toBeGreaterThan(0);
    }));
  });

  it('preserva o arquivo PNG original, atualiza a máscara e oculta os ícones decorativos', () => {
    const fixture = TestBed.createComponent(FigmaIcon);
    fixture.componentRef.setInput('name', 'step-completed'); fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(host.querySelector<HTMLElement>('.icone__mascara')?.style.maskImage).toContain('/icons/onboarding/completed.png');
    fixture.componentRef.setInput('name', 'home'); fixture.detectChanges();
    expect(host.querySelector('img')).toBeNull();
    expect(host.querySelector<HTMLElement>('.icone__mascara')?.style.maskImage).toContain('/icons/interface/home.svg');
    fixture.componentRef.setInput('name', 'arrow-left'); fixture.detectChanges();
    expect(host.querySelector('.icone__mascara--invertida')).not.toBeNull();
  });

  it('herda cores e mantém tamanho e proporção em espaços pequenos nos dois temas', () => {
    const fixture = TestBed.createComponent(FigmaIcon);
    fixture.componentRef.setInput('name', 'more');
    const host: HTMLElement = fixture.nativeElement;
    host.style.setProperty('--icon-size', '18px');
    host.style.color = 'var(--color-primary)';
    for (const theme of ['light', 'dark']) {
      document.documentElement.setAttribute('data-theme', theme);
      fixture.detectChanges();
      const mask = host.querySelector<HTMLElement>('.icone__mascara')!;
      expect(host.getBoundingClientRect().width).toBe(18);
      expect(host.getBoundingClientRect().height).toBe(18);
      expect(getComputedStyle(mask).maskSize).toBe('contain');
      expect(getComputedStyle(mask).backgroundColor).toBe(getComputedStyle(host).color);
      expect(host.getAttribute('tabindex')).toBeNull();
      expect(getComputedStyle(host).pointerEvents).toBe('none');
    }
  });

  it('não transforma valores desconhecidos em URLs ou HTML', () => {
    for (const invalid of ['https://exemplo.test/icon.svg', '../segredo', 'constructor', '<svg>']) {
      expect(iconResource(invalid).path).toBe('');
      expect(iconResource(invalid).symbol).toBe('◇');
    }
  });
});
