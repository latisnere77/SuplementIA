import { verifyPubMedPmids } from './pmid-verifier';

function pubMedResponse(entries: Record<string, { title?: string; journal?: string; pubdate?: string }>) {
  const uids = Object.keys(entries);
  return {
    ok: true,
    status: 200,
    json: async () => ({
      result: Object.fromEntries([
        ['uids', uids],
        ...uids.map((pmid) => [
          pmid,
          {
            uid: pmid,
            title: entries[pmid].title,
            fulljournalname: entries[pmid].journal,
            pubdate: entries[pmid].pubdate,
          },
        ]),
      ]),
    }),
  } as Response;
}

describe('verifyPubMedPmids', () => {
  it('validates a PMID that resolves to a PubMed article', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      pubMedResponse({
        '3544968': {
          title: 'Centella asiatica in venous insufficiency.',
          journal: 'Angiology',
          pubdate: '1987 Jan',
        },
      })
    );

    const result = await verifyPubMedPmids(['3544968'], { fetchFn });

    expect(result.status).toBe('all_valid');
    expect(result.validatedPmids).toEqual(['3544968']);
    expect(result.articles).toEqual([
      {
        pmid: '3544968',
        title: 'Centella asiatica in venous insufficiency.',
        journal: 'Angiology',
        year: '1987',
      },
    ]);
    expect(fetchFn).toHaveBeenCalledWith(expect.stringContaining('id=3544968'), expect.any(Object));
  });

  it('does not validate PMIDs that PubMed does not return', async () => {
    const fetchFn = jest.fn().mockResolvedValue(pubMedResponse({}));

    const result = await verifyPubMedPmids(['9999999999'], { fetchFn });

    expect(result.status).toBe('none_valid');
    expect(result.validatedPmids).toEqual([]);
    expect(result.rejectedPmids).toEqual(['9999999999']);
  });

  it('rejects non-numeric PMIDs before calling PubMed', async () => {
    const fetchFn = jest.fn();

    const result = await verifyPubMedPmids(['PMID:3544968', 'abc'], { fetchFn });

    expect(result.status).toBe('not_checked');
    expect(result.validatedPmids).toEqual([]);
    expect(result.rejectedPmids).toEqual(['PMID:3544968', 'abc']);
    expect(result.externalCalls).toBe(0);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('keeps the runner stable when PubMed verification fails', async () => {
    const fetchFn = jest.fn().mockRejectedValue(new Error('network timeout'));

    const result = await verifyPubMedPmids(['3544968'], { fetchFn });

    expect(result.status).toBe('verification_failed');
    expect(result.validatedPmids).toEqual([]);
    expect(result.error).toBe('network timeout');
    expect(result.externalCalls).toBe(1);
  });
});
