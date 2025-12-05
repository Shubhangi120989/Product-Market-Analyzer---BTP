import requests
from pprint import pprint
from ragas import SingleTurnSample
from ragas.metrics import IDBasedContextPrecision


cookies = {
    'ext_name': 'ojplmecpdpgccookcobabopnaifgidhf',
    'next-auth.csrf-token': '51b3423640934398ab955c184c1b2a24dfd036729d8f27143e196c53733570d0%7C0b0e677c1f25561510618caa072193d1c699ebc171d60defc39794d2cf4ee267',
    'next-auth.callback-url': 'http%3A%2F%2Flocalhost%3A3000%2Fdashboard',
    '__next_hmr_refresh_hash__': 'af398fd679cff04a9f0bfddd46837d52633457081244afec',
    'next-auth.session-token': 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..6o9NXR5iJCc5j5Xi.OukCyTi3dgHAoK6bYtHaZejSNyLeqewL-Hx-ejpqetU1eydK3TMn2DZxDvDmVAe2Rlq19BObCygHSrSncDB1RJq7HZeE0PbX1IBSw80TlxjcmyQ2ezF68AminIhN-RH8eIaua2lZZ_omKi6T3F_C37Cu8zq-S909rVYGyjFqH9CUis7mA1j0J0dkuNXOtnO8g_mq2Qjj5AyQ7tgQ632g1Zgycsjx0fsj9HkgK6LShXdvkNmlWpGGjo8Oy0Vad1a3bThvBapHYAh_Y79Vx4o8EF-OPawQd9qe-p7G0t11GmH1upVGnu8ni7MozbeXooet1tM__OTIsVcHLYz6Shq-boC7ONVGpL3sl1vmwfhkAvmiHjNzmbx-9R9GV7xdFmZSIYab7vgRdsPhz2dBpS-rElBFNw.9bACVpfDVQOoFTwB9D86og',
}

headers = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.8',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Content-Type': 'application/json',
    'Origin': 'http://localhost:3000',
    'Pragma': 'no-cache',
    'Referer': 'http://localhost:3000/product/69171e0bafd4b95081102b9d',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-GPC': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Brave";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
}

def ask_question(product_id, question):
    json_data = {
        'query': question,
        'productId': product_id,
    }

    response = requests.post('http://localhost:3000/api/getProductQueryTest', cookies=cookies, headers=headers, json=json_data)
    return response.json()


question = 'which are the phones which are most talked about by the people and why?'
product_id = '69171e0bafd4b95081102b9d'

# 1. api call krna hai
response = ask_question(product_id, question)

with_pipeline = response.get('with_pipeline')
with_pipeline_ai_response = with_pipeline.get('ai_response')
context_with_pipeline = with_pipeline.get('context_with_pipeline')

without_pipeline = response.get('without_pipeline')
without_pipeline_ai_response = without_pipeline.get('ai_response')
context_without_pipeline = without_pipeline.get('context_without_pipeline')



# create ragas matrix
ragas_matrix = {
    'with_pipeline': {
        'ai_response': with_pipeline_ai_response,
        'context': context_with_pipeline,
    },
    'without_pipeline': {
        'ai_response': without_pipeline_ai_response,
        'context': context_without_pipeline,
    }
}
pprint(ragas_matrix)

# 4 matrix me yeh sab chize input dalna for ex. 