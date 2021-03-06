import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import Logo from './logo';
import styled from 'styled-components';
import { useDrag } from 'react-dnd';

const CardElement = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1em;
`;

const DraggableCard = ({ bgColor, isBroadcastingDrag = true, isFlipBroadcasted, color, socket, text, type, setUserIsDragging, flippedByDefault = false }) => {
  const [ghostCard, setGhostCard] = useState({});
  const [isFlipped, setFlipped] = useState(flippedByDefault);
  const [{ isDragging, getDifferenceFromInitialOffset, draggedCard }, drag] = useDrag({
    item: {
      type,
      id: 0,
      text,
      bgColor,
      color,
      isFlipped,
    },
    collect: monitor => ({
      isDragging: !!monitor.isDragging() && !Object.keys(ghostCard).length,
      getDifferenceFromInitialOffset: !!monitor.isDragging() && monitor.getDifferenceFromInitialOffset(),
    })
  })

  if (isDragging && getDifferenceFromInitialOffset) {
    const { x, y } = getDifferenceFromInitialOffset;

    if (isBroadcastingDrag) {
      // send dragged card to server
      socket.emit('dragged card', { type, text, x, y });
    }
  }

  useEffect(() => {
    if (isBroadcastingDrag) {
      setUserIsDragging(true);

      if (!isDragging) {
        // send card that was let go to server
        socket.emit('let go card', { ghostDragging: false, type, text });

        setUserIsDragging(false);
      }
    }

    return () => {
      setUserIsDragging(false);
    }
  }, [isDragging])

  useEffect(() => {
    let isMounted = true;
    if (isBroadcastingDrag) {
      // on everyones client but the sender, show the card being returned to deck if let go prematurely
      socket.on('let go card', ({ text: otherText, }) => {
        if (isMounted && text === otherText) {
          setGhostCard({});
        }
      });

      // on everyones client but the sender, show the card being dragged
      socket.on('dragged card', ({ text: otherText, x, y }) => {
        if (isMounted && text === otherText) {
          setGhostCard({ x, y, text });
        }
      });
    }

    if (isFlipBroadcasted) {
      socket.on('card is flipped', function ({ isFlipped, text: otherText, }) {
        if (isMounted && text === otherText) {
          setFlipped(isFlipped);
        }
      });
    }

    return () => {
      // socket.off('let go card');
      // socket.off('dragged cards');
      isMounted = false;
    }

  }, []);

  const getTransform = () => {
    if (isBroadcastingDrag) {
      // any cards being dragged by someone else
      if (Object.keys(ghostCard).length) {
        if (ghostCard.text === text) {
          return { pointerEvents: 'none', opacity: '.5', transform: `translate3d(${ghostCard.x}px, ${ghostCard.y}px, 0)`, zIndex: '1' };
        } else {
          return { pointerEvents: 'none', transform: 'none' };
        }
      }
    }

    // on the client that's actually dragging the card
    if (isDragging && getDifferenceFromInitialOffset) {
      return { pointerEvents: 'none', transform: `translate3d(${getDifferenceFromInitialOffset.x}px, ${getDifferenceFromInitialOffset.y}px, 0)` };
    }

    return { transform: 'none' };
  }

  return (
    <CardElement onClick={() => {
      setFlipped(isFlipped => {
        socket.emit('card is flipped', { isFlipped: !isFlipped, text });
        return !isFlipped
      });
    }} ref={drag} style={{ zIndex: (isDragging ? 999 : 'auto'), ...getTransform(), backgroundColor: bgColor, color }}>

      {isFlipped ? text : (
        <Logo />
      )}
    </CardElement>

  )
}
// DraggableCard.propTypes = {
//   opaqueOnPickup: PropTypes.bool,
// }
// DraggableCard.defaultProps = {
//   opaqueOnPickup: true,
// }

export default DraggableCard;