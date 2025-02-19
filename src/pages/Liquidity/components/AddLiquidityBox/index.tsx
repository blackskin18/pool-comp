import React, { useEffect, useMemo, useState } from 'react'
import { useCurrentPool } from '../../../../state/currentPool/hooks/useCurrentPool'
import { Text, TextGrey, TextPink } from '../../../../Components/ui/Text'
import { useListTokens } from '../../../../state/token/hook'
import { Input } from '../../../../Components/ui/Input'
import { SkeletonLoader } from '../../../../Components/ui/SkeletonLoader'
import { TokenIcon } from '../../../../Components/ui/TokenIcon'
import { TokenSymbol } from '../../../../Components/ui/TokenSymbol'
import { bn, decodeErc1155Address, numberToWei, parseCallStaticError, weiToNumber } from '../../../../utils/helpers'
import { formatWeiToDisplayNumber } from '../../../../utils/formatBalance'
import { SelectTokenModal } from '../../../../Components/SelectTokenModal'
import { useWalletBalance } from '../../../../state/wallet/hooks/useBalances'
import { Box } from '../../../../Components/ui/Box'
import './style.scss'
import { ButtonExecute } from '../../../../Components/ui/Button'
import { IconArrowDown } from '../../../../Components/ui/Icon'
import { POOL_IDS } from '../../../../utils/constant'
import { BigNumber } from 'ethers'
import { useMultiSwapAction } from '../../../../hooks/useMultiSwapAction'
import { useWeb3React } from '../../../../state/customWeb3React/hook'
import useSWR from 'swr'
import { getNativePrice } from 'derivable-tools/dist/price'
import { useConfigs } from '../../../../state/config/useConfigs'

const shareOfPoolUnit = 1000

export const AddLiquidityBox = ({ totalSupplyCP }: {totalSupplyCP: BigNumber}) => {
  const { account, showConnectModal } = useWeb3React()
  const { cToken, baseToken, poolAddress, quoteToken, logicAddress } = useCurrentPool()
  const { tokens } = useListTokens()
  const { balances, routerAllowances, approveRouter } = useWalletBalance()
  const [loading, setLoading] = useState<boolean>(false)
  const [amountIn, setAmountIn] = useState<string>()
  const [amountOut, setAmountOut] = useState<string>()
  const [tokenAdd, setTokenAdd] = useState<string>('')
  const [callError, setCallError] = useState<string>('')
  const [txFee, setTxFee] = useState<BigNumber>(bn(0))
  const { chainId } = useConfigs()
  const [visibleSelectTokenModal, setVisibleSelectTokenModal] = useState<boolean>(false)
  const { multiSwap, calculateAmountOuts } = useMultiSwapAction()
  const { data: nativePrice } = useSWR({ chainId }, (params) => getNativePrice(params))

  useEffect(() => {
    setTokenAdd(cToken || '')
  }, [logicAddress])

  useEffect(() => {
    if (tokens[tokenAdd] && amountIn && Number(amountIn)) {
      calcAmountOut()
    } else if (Number(amountIn) === 0) {
      setAmountOut('')
      setTxFee(bn(0))
      setAmountOut('')
    }
  }, [tokens[tokenAdd], amountIn])

  const cpAddress = useMemo(() => {
    return poolAddress + '-' + POOL_IDS.cp
  }, [poolAddress])

  const shareOfPool = useMemo(() => {
    const amountOutBn = bn(numberToWei(amountOut || '0'))
    if (totalSupplyCP.add(amountOutBn).isZero()) return 0

    return amountOutBn
      .add(balances[cpAddress] || 0)
      .mul(100 * shareOfPoolUnit)
      .div(totalSupplyCP.add(amountOutBn))
      .toNumber() / shareOfPoolUnit
  }, [amountOut, totalSupplyCP, balances[cpAddress]])

  const calcAmountOut = async () => {
    if (!amountOut) {
      setCallError('Calculating...')
    }
    calculateAmountOuts([{
      tokenIn: tokenAdd,
      tokenOut: poolAddress + '-' + POOL_IDS.cp,
      amountIn: bn(numberToWei(amountIn, tokens[tokenAdd]?.decimal || 18))
    }], false).then((res) => {
      const [aOuts, gasLeft] = res
      console.log(aOuts)
      setAmountOut(weiToNumber(aOuts[0]?.amountOut || 0, tokens[poolAddress + '-' + POOL_IDS.cp].decimal || 18))
      // @ts-ignore
      setTxFee(detectTxFee(gasLeft))
      // @ts-ignore
      setCallError('')
    }).catch((e) => {
      const error = parseCallStaticError(e)
      setAmountOut('0')
      setTxFee(bn(0))
      setCallError(error ?? e)
      console.log(e)
    })
  }

  const detectTxFee = (gasUsed: BigNumber) => {
    return gasUsed.mul(2).div(3).mul(5 * 10 ** 9)
  }

  const renderExecuteButton = () => {
    const address = decodeErc1155Address(tokenAdd).address

    if (!tokens[tokenAdd] || loading) {
      return <ButtonExecute className='add-liquidity__action' disabled>Loading...</ButtonExecute>
    } else if (!account) {
      return <ButtonExecute
        onClick={() => {
          showConnectModal()
        }}
        className='add-liquidity__action'
      >Connect wallet</ButtonExecute>
    } else if (Number(amountIn) === 0) {
      return <ButtonExecute className='add-liquidity__action' disabled>Enter Amount</ButtonExecute>
    } else if (!balances[tokenAdd] || balances[tokenAdd].lt(numberToWei(amountIn || 0, tokens[tokenAdd]?.decimal || 18))) {
      return <ButtonExecute className='add-liquidity__action'
        disabled> Insufficient {tokens[tokenAdd].symbol} Amount </ButtonExecute>
    } else if (!routerAllowances[address] || routerAllowances[address].lt(numberToWei(amountIn || 0, tokens[tokenAdd]?.decimal || 18))) {
      return <ButtonExecute
        className='add-liquidity__action'
        onClick={async () => {
          setLoading(true)
          await approveRouter({ tokenAddress: tokenAdd })
          setLoading(false)
        }}
      >Approve</ButtonExecute>
    } else if (callError) {
      return <ButtonExecute className='add-liquidity__action' disabled>{callError}</ButtonExecute>
    } else {
      return <ButtonExecute
        className='add-liquidity__action'
        onClick={async () => {
          setLoading(true)
          await multiSwap([{
            tokenIn: tokenAdd,
            tokenOut: cpAddress,
            amountIn: bn(numberToWei(amountIn, tokens[tokenAdd]?.decimal || 18)),
            amountOutMin: 0
          }], false)
          setAmountIn('')
          setAmountIn('')
          setLoading(false)
        }}
      >Add liquidity</ButtonExecute>
    }
  }

  return <div className='add-liquidity-box'>
    <div className='text-center mb-1'><Text>Add Liquidity</Text></div>
    <div className='text-center mb-1'>
      <TextPink>{tokens[cToken]?.symbol}_{tokens[baseToken]?.symbol}_{tokens[quoteToken]?.symbol}</TextPink>
    </div>
    <div className='mb-1'>
      <InfoRow className='mb-1'>
        <SkeletonLoader loading={!tokens[tokenAdd]}>
          <span
            className='add-liquidity__token'
            onClick={(address) => {
              setVisibleSelectTokenModal(true)
            }}
          >
            <span className='mr-05'><TokenIcon size={24} tokenAddress={tokenAdd} /></span>
            <Text><TokenSymbol token={tokens[tokenAdd]} /></Text>
          </span>
        </SkeletonLoader>
        <SkeletonLoader loading={!balances[tokenAdd]}>
          <Text
            className='amount-input-box__head--balance cursor-pointer'
            onClick={() => {
              setAmountIn(weiToNumber(balances[tokenAdd], tokens[tokenAdd]?.decimal || 18))
            }}
          >Balance: {balances && balances[tokenAdd]
              ? formatWeiToDisplayNumber(
                balances[tokenAdd],
                4,
              tokens[tokenAdd]?.decimal || 18
              )
              : 0
            }
          </Text>
        </SkeletonLoader>
      </InfoRow>
      <Input
        placeholder='0.0'
        className='fs-24'
        // @ts-ignore
        value={amountIn}
        onChange={(e) => {
          // @ts-ignore
          if (Number(e.target.value) >= 0) {
            setAmountIn((e.target as HTMLInputElement).value)
          }
        }}
      />
    </div>

    <div className='text-center mt-2 mb-1'>
      <span className='add-liquidity__arrow-down'>
        <IconArrowDown fill='#01A7FA' />
      </span>
    </div>
    <div className='mb-1'>
      <InfoRow className='mb-1'>
        <SkeletonLoader loading={!tokens[tokenAdd]}>
          <span
            className='add-liquidity__token'
          >
            <span className='mr-05'><TokenIcon size={24} tokenAddress={poolAddress + '-' + POOL_IDS.cp} /></span>
            <Text><TokenSymbol token={tokens[poolAddress + '-' + POOL_IDS.cp]} /></Text>
          </span>
        </SkeletonLoader>
        <SkeletonLoader loading={!balances[tokenAdd]}>
          <Text
            className='amount-input-box__head--balance cursor-pointer'
          >Balance: {balances && balances[poolAddress + '-' + POOL_IDS.cp]
              ? formatWeiToDisplayNumber(
                balances[poolAddress + '-' + POOL_IDS.cp],
                4
              )
              : 0
            }
          </Text>
        </SkeletonLoader>
      </InfoRow>
      <Input
        placeholder='0.0'
        className='fs-24'
        // @ts-ignore
        value={amountOut}
        readOnly
      />
    </div>
    <Box borderColor='#3a3a3a' className='add-liquidity__info-box mb-1'>
      <InfoRow>
        <Text>Transaction Fee</Text>
        <Text>
          {weiToNumber(txFee, 18, 4)}
          <TextGrey> BNB </TextGrey>
          (${weiToNumber(txFee.mul(numberToWei(nativePrice)), 36, 2)})
        </Text>
      </InfoRow>
      <InfoRow>
        <Text>TRC</Text>
        <Text>1.5</Text>
      </InfoRow>
      <InfoRow>
        <Text>Share of pool</Text>
        <Text>{shareOfPool}%</Text>
      </InfoRow>
    </Box>
    <div className='actions'>
      {renderExecuteButton()}
    </div>
    <SelectTokenModal
      visible={visibleSelectTokenModal}
      setVisible={setVisibleSelectTokenModal}
      tokens={[
        cToken,
        baseToken,
        quoteToken
      ]}
      onSelectToken={(address: string) => {
        setTokenAdd(address)
      }}
    />
  </div>
}

const InfoRow = (props: any) => {
  return (
    <div
      className={
        'd-flex jc-space-between info-row font-size-12 ' + props.className
      }
    >
      {props.children}
    </div>
  )
}
