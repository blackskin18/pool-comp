import React, { useEffect, Fragment, useMemo, useState } from 'react'
import { CustomTokenIcon } from '../Icon'
import { useHelper } from '../../../state/config/useHelper'
import { decodeErc1155Address, isErc1155Address } from '../../../utils/helpers'
import { useCurrentPool } from '../../../state/currentPool/hooks/useCurrentPool'
import './style.scss'
import { POOL_IDS } from '../../../utils/constant'

export const TokenIcon = (props: {
  src?: string
  className?: string
  tokenAddress?: string
  size?: number
}) => {
  const { powers, poolAddress, cToken } = useCurrentPool()
  const { getTokenIconUrl } = useHelper()
  const [isError, setIsError] = useState<boolean>(!props.src)
  const style = {
    width: props.size || 50,
    height: props.size || 50,
    borderRadius: '50%'
  }

  const onError = () => {
    setIsError(true)
  }

  useEffect(() => {
    setIsError(false)
  }, [props.src])

  const poolToken = useMemo(() => {
    if (props.tokenAddress && isErc1155Address(props.tokenAddress)) {
      const { id } = decodeErc1155Address(props.tokenAddress)
      if (Number(id) === POOL_IDS.cp) {
        return <div style={style} className='pool-token-logo pool-token-logo__cp'>CP</div>
      }
      return <div
        style={style}
        className={`pool-token-logo ${powers[id] > 0 ? 'pool-token-logo__long' : 'pool-token-logo__short'}`}
      >
        {powers[id] > 0 && '+'}{powers[id]}
      </div>
    } else if (props.tokenAddress === poolAddress) {
      return <div style={style} className='pool-token-logo pool-token-logo__cp'>CP</div>
    } else if (props.tokenAddress === cToken) {
      return <div style={style} className='pool-token-logo pool-token-logo__lp'>LP</div>
    }
    return ''
  }, [props.tokenAddress])

  const src = useMemo(() => {
    if (props.src) return props.src
    if (!props.tokenAddress) return ''
    return getTokenIconUrl(props.tokenAddress)
  }, [props])

  if (poolToken) {
    return <Fragment>{poolToken}</Fragment>
  }

  if (isError || !src) {
    return <CustomTokenIcon size={props.size || 50} {...props} />
  } else {
    return (
      <img
        onError={onError}
        style={{
          width: props.size || 50,
          height: props.size || 50,
          borderRadius: '50%'
        }}
        {...props}
        src={src}
      />
    )
  }
}
