import { test, expect } from '@playwright/test';
import { examples, serializeCSV } from '../lib/finance.mjs';

test('가상 체험 → 필터 → 비교 → 메모·관심 저장 → 재접속',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await expect(page.getByText('실제 데이터 미연결',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'가상 예제로 체험',exact:true}).click();
  await expect(page.locator('tbody tr')).toHaveCount(12);
  await page.getByRole('button',{name:'우량 성장',exact:false}).click();
  await expect(page.getByText('현재 조건에 맞는 종목이 없습니다.')).toBeVisible();
  await page.getByRole('button',{name:'전체 탐색',exact:false}).click();
  await page.getByPlaceholder('종목명, 코드, 업종').fill('반도체');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByPlaceholder('종목명, 코드, 업종').fill('');
  await page.getByRole('checkbox',{name:'예시 반도체 비교 선택'}).check();
  await page.getByRole('checkbox',{name:'예시 자동화 비교 선택'}).check();
  await page.getByRole('button',{name:'2개 종목 비교'}).click();
  await expect(page.getByRole('dialog',{name:'후보 종목 비교'})).toBeVisible();
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  await page.getByRole('button',{name:'예시 반도체 관심 저장'}).click();
  await page.getByRole('button',{name:'예시 반도체',exact:false}).filter({has:page.locator('small')}).click();
  await page.getByRole('textbox',{name:'투자 가설 메모'}).pressSequentially('고객 집중 위험 확인');
  await expect(page.getByRole('textbox',{name:'투자 가설 메모'})).toHaveValue('고객 집중 위험 확인');
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  await page.reload();
  await expect(page.locator('tbody tr')).toHaveCount(12);
  await expect(page.getByRole('button',{name:'예시 반도체 관심 해제'})).toBeVisible();
  await page.getByRole('button',{name:'예시 반도체',exact:false}).filter({has:page.locator('small')}).click();
  await expect(page.getByRole('textbox',{name:'투자 가설 메모'})).toHaveValue('고객 집중 위험 확인');
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:'../value-lab-desktop.png',fullPage:true});
  expect(errors).toEqual([]);
});

test('CSV 업로드 → 실데이터 모드 → CSV 내보내기 → API 제거 확인',async({page,request})=>{
  await page.goto('/');await page.getByRole('button',{name:'실제 데이터 연결',exact:true}).click();
  const rows=[{...examples[0],name:'테스트 기업',source:'자동화 테스트 fixture · 투자용 데이터 아님'}];
  await page.locator('input[type=file]').setInputFiles({name:'fixture.csv',mimeType:'text/csv',buffer:Buffer.from(serializeCSV(rows),'utf8')});
  await expect(page.getByText('업로드 데이터',{exact:true})).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'결과 내보내기'}).click();expect((await download).suggestedFilename()).toBe('value-lab-results.csv');
  await page.getByRole('button',{name:'테스트 기업',exact:false}).filter({has:page.locator('small')}).click();
  await expect(page.getByRole('dialog').getByRole('button',{name:'공식 재무제표 조회'})).toHaveCount(0);
  const removed=await request.get('/api/dart');expect(removed.status()).toBe(404);
});

test('잘못된 CSV는 교체하지 않고 오류를 표시한다',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'실제 데이터 연결',exact:true}).click();
  await page.locator('input[type=file]').setInputFiles({name:'bad.csv',mimeType:'text/csv',buffer:Buffer.from('code,name\n123,실패')});
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('필수 열 누락');
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('모바일에서 검색과 상세 검토가 가능하다',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');
  await page.getByRole('button',{name:'가상 예제로 체험',exact:true}).click();
  await page.getByPlaceholder('종목명, 코드, 업종').fill('자동화');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button',{name:'예시 자동화',exact:false}).filter({has:page.locator('small')}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:'../value-lab-mobile.png',fullPage:true});
});
